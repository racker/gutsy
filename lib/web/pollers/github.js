var _ = require('underscore');
var util = require('util');
var utils = require('../../utils');
var async = require('async');
var url = require('url');

/** Adds github field to devops if github related api is present
 * @param {object} devops devops object
 */
module.exports = function github(payload) {
  var api_config = payload.config;
  var open_options = make_github_options(api_config);
  var closed_options = make_github_options(api_config, true);

  var pulls;

  async.parallel({
    open_pull_requests: function(cb){
      utils.request_maker(open_options, cb);
    },
    closed_pull_requests: function(cb){
      utils.request_maker(closed_options,cb);
    }
  },function(errors, results){
    var data = [];

    if (errors) {
      payload.error = errors;
      return;
    }

    try{
       // open_pull_requests: github response string
      _.each(results, function(val, key) {
        val = JSON.parse(val.data);
        data = data.concat(val);
      });
      data = parse_github_response(data);
    } catch (e){
      payload.error = e;
      return;
    }
    payload.data = data;
  });
};

/**
 * Parses
 * @param data List of pull requests
 * @returns
 */
var parse_github_response = function(data){
  var username, user_data = {};
  var avg_merge_age_metric, avg_staleness_metric, number_metric;
  var metrics = [];

  avg_merge_age_metric = new MergeMetric("Merged pull request avg age", "days");
  avg_staleness_metric = new StaleMetric("Stale pull request avg age", "days");
  number_metric = new NumberMetric("number of pull requests", "");
  metrics.push(avg_merge_age_metric);
  metrics.push(avg_staleness_metric);
  metrics.push(number_metric);

  _.each(data, function(pull) {
    _.each(metrics, function(metric) {
      metric.handle_pull(pull);
    });

    username = pull.user.login;
    if (!(username in user_data)) {
      user_data[username] = [];
    }
    user_data[username].push(pull);
  });

  _.each(metrics, function(metric) {
    var usernames = Object.getOwnPropertyNames(user_data);
    _.each(usernames, function(username) {
      metric.handle_user_pulls(username, user_data[username]);
    });
  });

  var formatted_metrics = [];
  _.each(metrics, function(metric) {
    formatted_metrics.push(metric.get_stats());
  });

  return formatted_metrics;
};

/**
 *
 * @param devops_github
 * @param is_closed
 * @returns
 */
var make_github_options = function(devops_github, is_closed) {
  var parsed_url = url.parse(devops_github.url);
  var path = [
    "/repos/",
    devops_github.org,
    "/",
    devops_github.repo,
    '/pulls'
  ];

  if (is_closed) {
    path.push("?state=closed");
  }else{
    path.push('?state=open');
  }
  path.push('&per_page=150&page=1');

  return {
    host: parsed_url.host,
    port: 443,
    path: path.join(''),
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': utils.create_basic_auth(devops_github.username,
        devops_github.apikey)
    }
  };
};

/**
 * Pulls out metric information for a set of Github pull request objects.
 * @todo The "user" part of the name "user_stats" is an assumption not a requirement.
 * @param {list} pull List of Github pull request objects
 * @returns {object} like so:
 * {
    number_pull_requests: total number
    number_merged: number merged
    number_stale: number still open
    number_tested: 0
    number_commits: 0
    avg_merged_life_span: number (days)
    avg_total_life_span: number (days)
    avg_stale_life_span: number (days)
    };
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

    // get total merged stats
    if (merged_at) {
      number_merged++;
      merged_life_span_time += (merged_at - created_at);
    }

    var is_stale =  !(merged_at && closed_at);
    // this is tricky, all pulls have been stale for some time
    if (is_stale){
      // number_stale refers to pulls that are currently stale
      number_stale++;
      // stale time for closed tickets
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
 * @param {number} total_seconds Total number of seconds
 * @param {number} number Total number of (probably) pull requests
 * @return {number} The average number of days
 */
var avg_days = function(total_seconds, number) {
  var avg_seconds = 0;
  if (number) {
    avg_seconds = total_seconds / number;
    return (avg_seconds / 1000 / 60 / 60 / 24).toFixed(1);
  } else {
    return avg_seconds;
  }
};

/**
 * Abstract parent class for metric data.
 * Subclasses should implement get_stats and at least one of handle_pull and handle_user_pulls.
 *
 * @param name {string} Human readable name for what this metric is
 * @param unit {string} Human readable units of metric
 */
var Metric = function(name, unit) {
  // {string} Human readable name for what this metric is
  this._name = name;
  // {string} Human readable units of metric
  this._unit = unit;
  // {int} Total number or 100% or whatever makes sense based on units and data
  this._aggregate = 0;
  // {array} List of mappings between Github username and metric value
  this._stats = [];
};

/**
 * @param pull {object} A pull request object from Github @TODO give example
 * @side-effecting and likely NOT idempotent
 */
Metric.prototype.handle_pull = function(pull) {
  // implement this
};

/**
 * @param username {string} A Github username
 * @param pulls {array} pulls List of Github pull request objects.
 * @side-effecting and likely NOT idempotent
 */
Metric.prototype.handle_user_pulls = function(username, pulls) {
  // implement this
};

Metric.prototype.get_stats = function() {
  // implement this
};

/**
 * Total number of pull requests
 */
var NumberMetric = function(name, unit) {
  this._name = name;
  this._unit = unit;
  this._aggregate = 0;
  this._stats = [];
  this._obj_stats = {};
};
// @TODO are we using this correctly? Seems lame to have to redefine the parent methods if not
// overwriting them.
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

/**
 * Average time to merge pull requests
 */
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
  this._aggregate += parseFloat(userstats.avg_total_life_span);
};

MergeMetric.prototype.get_stats = function() {
  return {
    name: this._name,
    unit: this._unit,
    aggregate: (this._aggregate / _.keys(this._stats).length).toFixed(1),
    stats: this._stats
  };
};

/**
 * Average time stale pull requests have lain open
 */
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
  this._aggregate += parseFloat(userstats.avg_stale_life_span);
};

StaleMetric.prototype.get_stats = function() {
  return {
    name: this._name,
    unit: this._unit,
    aggregate: (this._aggregate / _.keys(this._stats).length).toFixed(1),
    stats: this._stats
  };
};
