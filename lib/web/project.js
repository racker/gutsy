var emitter = require('events').EventEmitter;

var settings = require('../settings');assert.ok(value, message);
var utils = require('../utils').common;
var constants = require('../utils').constants;
var _ = require('underscore');
var path = require('path');

var db = require('./db');
var pollers = require('./pollers');
var log = require('../log');

var make_defaults = function(){
  return {
    tags:  [],
    links:  {},
    environments:  [],
    metadata:  {},
    related_apis:  {},
    dependent_services:  [],
    events:  [],
    contacts: [],
    kpi_spec:  '',
    errors:  [],
    pager_duty:  null,
    version_one:  null,
    github:  null,
    new_relic:  null,
    dreadnot:  null,
    release_notes: null,
    needs_creds: false
  };
};


var Project = function(project){
  var self = this;

  self.pollers = {};
  self.interval_id = null;
  self.load_devops(project);
};

Project.load_devops = function(project){
  var self = this;
  var devops_json;

  _.each(db_project, function(val, key){
    self[key] = val;
  });

  devops_json = self.devops_json ? JSON.parse(self.devops_json): {};

  // fill in missing optional fields
  _.defaults(devops_json, make_defaults());

  self.creds = null;
  if (self.creds) {
    self.creds = JSON.parse(self.creds);
  }

  _.each(devops_json.related_apis, function(api_obj, api_name){
    _.each(api_obj, function (value, key) {
      if (value === constants.EXTERNAL_TOKEN) {
        if (!self.creds || !self.creds[api_name] || self.creds[api_name][key] === undefined || self.creds[api_name][key] === "") {
          devops_json.needs_creds = true;
        } else {
          api_obj[key] = self.creds[api_name][key];
        }
      }
    });
    devops_json[api_name] = api_obj;
  });

  if (devops_json.related_apis.github !== undefined) {
    devops_json.related_apis.github.repo = [].concat(devops_json.related_apis.github.repo);
  }
  self.devops = devops_json;
};
Project.install_pollers = function(){
  log.log("Installing pollers...");

  var self = this;

  var poll_intervals = [];
  var pollers = {};
  var related_api_name;
  var poller_series = [];
  var i;
  var _pollers;
  var poll_interval;

  //uninstall(self.name);

  _.each(pollers.polling_apis, function(poller_obj, poller_name){
    var poller_config = {};
    var poller;
    self.pollers[poller_name] = null;

    // build configs for the poller
    _.each(poller_obj.related_apis, function (api_name) {
      // does the project support this api?
      if (!self.devops || !self.devops.related_apis || !self.devops.related_apis[api_name]) {
        return;
      }
      // give the poller
      poller_config[api_name] = self.devops.related_apis[api_name];
    });

    // no api in the devops when we expected one
    if (poller_obj.related_apis.length > 0 && _.keys(poller_config).length <= 0) {
      return;
    }

    poller = new Poller(poller_name, poller_obj.poller, poller_config, function () {
      return self.name;
    });
    self.pollers[poller_name] = poller;

    poll_intervals.push(poller.poll_interval);
    pollers[poller_obj.priority] = pollers[poller_obj.priority] || [];

    pollers[poller_obj.priority].push(function(cb){
      poller.poll(cb);
    });
  });

  poll_interval = _.min(poll_intervals);
  for (i = 0; i < priorities.length; i++){
    // needless complexity to bind i
    _pollers = function(i){
      return function(cb){
        async.parallel(pollers[i], function(err, results){
          if (err){
            log.error(err);
          }
          cb(null, results);
        });
      };
    };
    poller_series.push(_pollers(i));
  }

  var call_pollers = function() {
    async.series(poller_series, function(err, results){
      if (err){
        log.error(err);
      }
    });
  };

  call_pollers();
  self.interval_id = setInterval(call_pollers, poll_interval);
};
Project.prototype = emitter;
exports.Project = Project;


