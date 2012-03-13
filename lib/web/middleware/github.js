var _ = require('underscore');
var util = require('util');
var utils = require('../../utils');
url = require('url'),

/** Adds github field to devops if github related api is present
 * @param {object} devops devops object
 */
module.exports = function github(req, res, next) {
  // No-op if GitHub creds aren't provided
  if (!req.devops.related_apis || !req.devops.related_apis.github) {
    return next();
  }

  var open_options = make_github_options(req.devops.related_apis.github);
  var closed_options = make_github_options(req.devops.related_apis.github, true);
  var pulls;
  req.devops.github = {
      'error': null,
      'data': null
  };
  utils.request_maker(
      open_options,
      function(data) {
        var i, j, length, user_data = {};
        var avg_merge_age_metric, avg_staleness_metric, number_metric;
        var metrics = [];
        try {
          data = JSON.parse(data);
          if (!data.message) {
            avg_merge_age_metric = new MergeMetric("Merged pull request avg age", "days");
            avg_staleness_metric = new StaleMetric("Stale pull request avg age", "days");
            number_metric = new NumberMetric("number of pull requests", "");
            metrics.push(avg_merge_age_metric);
            metrics.push(avg_staleness_metric);
            metrics.push(number_metric);

            length = data.pulls.length;
            for (i = 0; i < length; i++) {
              var pull = data.pulls[i];

              for (j = 0; j < metrics.length; j++) {
                metrics[j].handle_pull(pull);
              }

              var username = pull.user.login;
              if (!(username in user_data)) {
                user_data[username] = [];
              }
              user_data[username].push(pull);
            }

            for (i = 0; i < metrics.length; i++) {
              var usernames = Object.getOwnPropertyNames(user_data);
              for (j = 0; j < usernames.length; j++) {
                metrics[i].handle_user_pulls(usernames[j], user_data[usernames[j]]);
              }
            }

            var formatted_metrics = [];
            for (i = 0; i < metrics.length; i++) {
              formatted_metrics.push(metrics[i].get_stats());
            }

            req.devops.github.data = {
                repo: req.devops.related_apis.github.repo,
                metrics: formatted_metrics
            };
          } else {
            req.devops.github.error = data.message;
          }
        } catch (e) {
          req.devops.github.error = e;
        }
        next();
      },
      function(e) {
        req.devops.github.error = e;
        next();
      });
};

/**
 *
 * @param devops_github
 * @param is_closed
 * @returns
 */
var make_github_options = function(devops_github, is_closed) {
  var auth = [devops_github.username,
              '/token:',
              devops_github.apikey].join("");
  var path = ["/api/v2/json/pulls/",
              devops_github.org,
              "/",
              devops_github.repo];
  var parsed_url = url.parse(devops_github.url);

  if (is_closed) {
    path.push("/closed");
  }
  return {
    host: parsed_url.host,
    port: {'https:': 443, 'http:': 80}[parsed_url.protocol],
    path: path.join(""),
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + new Buffer(auth, "ascii").toString('base64')
    }
  };
};

/**
 *
 */
var user_stats = function(pulls) {
  // pull request counts
  var number_pull_requests = pulls.length;
  var number_merged = 0;
  var number_stale = 0;
  var number_tested = 0;
  // commit counts
  var number_commits = 0;
  // avg times
  var merged_life_span_time = 0; // against number_merged
  var total_life_span_time = 0; // against number_pull_requests
  var stale_time = 0; // against number_stale

  var now = Date.now();
  for(var i = 0; i < pulls.length; i++) {
    var pull = pulls[i];
    var created_at = Date.parse(pull.created_at);
    var updated_at = Date.parse(pull.updated_at);
    var merged_at = pull.merged_at;
    var closed_at = pull.closed_at;
    if (merged_at) { merged_at = Date.parse(merged_at); }
    if (closed_at) { closed_at = Date.parse(closed_at); }

    if (merged_at) {
      number_merged++;
      merged_life_span_time += (merged_at - created_at);
    }
    if (!merged_at && !closed_at) {
      number_stale++;
      stale_time += (now - updated_at);
    }
    if (closed_at) {
      total_life_span_time += (closed_at - created_at);
    } else {
      total_life_span_time += (now - created_at);
    }
  }
  return {
    number_pull_requests: number_pull_requests,
    number_merged: number_merged,
    number_stale: number_stale,
    number_tested: number_tested,
    number_commits: number_commits,
    avg_merged_life_span: avg_days(merged_life_span_time, number_merged),
    avg_total_life_span: avg_days(total_life_span_time, number_pull_requests),
    avg_stale_life_span: avg_days(stale_time, number_stale)
    };
};

/**
 *
 */
var avg_days = function(total_seconds, number) {
  if (number) {
    avg_seconds = total_seconds / number;
    return (avg_seconds / 1000 / 60 / 60 / 24).toFixed(1);
  } else {
    return 0;
  }
};

var Metric = function(name, unit) {
  this._name = name;
  this._unit = unit;
  this._aggregate = 0;
  this._stats = [];
};

Metric.prototype.handle_pull = function(pull) {
  // implement this
};

Metric.prototype.handle_user_pulls = function(username, pulls) {
  // implement this
};

Metric.prototype.get_stats = function() {
  // implement this
};

var NumberMetric = function(name, unit) {
  this._name = name;
  this._unit = unit;
  this._aggregate = 0;
  this._stats = [];
  this._obj_stats = {};
};
util.inherits(NumberMetric, Metric);

NumberMetric.prototype.handle_pull = function(pull) {
  this._aggregate++;
  if (!this._obj_stats[pull.user.login]) {
    this._obj_stats[pull.user.login] = 0;
  }
  this._obj_stats[pull.user.login]++;
};

NumberMetric.prototype.handle_user_pulls = function(username, pulls) {
  // implement this
};

NumberMetric.prototype.get_stats = function() {
  var self = this;
  var stats =  _.map(
      Object.getOwnPropertyNames(self._obj_stats),
      function(x) {
        var m = {};
        m[x] = self._obj_stats[x];
        return m;
      });
  return {
    name: self._name,
    unit: self._unit,
    aggregate: self._aggregate,
    stats: stats};
};

var MergeMetric = function(name, unit) {
  this._name = name;
  this._unit = unit;
  this._aggregate = 0;
  this._stats = [];
};
util.inherits(MergeMetric, Metric);

MergeMetric.prototype.handle_pull = function(pull) {
  // implement this
};

MergeMetric.prototype.handle_user_pulls = function(username, pulls) {
  var userstats = user_stats(pulls);
  var m = {};
  m[username] = userstats.avg_total_life_span;
  this._stats.push(m);
};

MergeMetric.prototype.get_stats = function() {
  return {
    name: this._name,
    unit: this._unit,
    aggregate: this._aggregate,
    stats: this._stats
  };
};

var StaleMetric = function(name, unit) {
  this._name = name;
  this._unit = unit;
  this._aggregate = 0;
  this._stats = [];
};
util.inherits(StaleMetric, Metric);

StaleMetric.prototype.handle_pull = function(pull) {
  // implement this
};

StaleMetric.prototype.handle_user_pulls = function(username, pulls) {
  var userstats = user_stats(pulls);
  var m = {};
  m[username] = userstats.avg_stale_life_span;
  this._stats.push(m);
};

StaleMetric.prototype.get_stats = function() {
  return {
    name: this._name,
    unit: this._unit,
    aggregate: this._aggregate,
    stats: this._stats
  };
};
