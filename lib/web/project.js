var _ = require('underscore');
var path = require('path');
var async = require('async');
var emitter = require('events').EventEmitter;
var url = require('url');

var settings = require('../settings');
var utils = require('../utils').common;
var constants = require('../utils').constants;

var db = require('./db');
var pollers = require('./pollers');
var PRIORITIES = pollers.PRIORITIES;
var POLLING_APIS = pollers.POLLING_APIS;
var Poller = pollers.Poller;
var log = require('../log');
var hooks = require('./hooks').hooks;

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
    errors:  []
  };
};

var Project = utils.make_class({
  init: function (project) {
    var self = this;

    self.pollers = {};
    self.interval_id = null;
    self.devops = null;
    self.needs_creds = false;
    self.crawled_at = new Date(0);
    self.crawl_err = null;


    self.data = {};
    _.each(POLLING_APIS, function (polling_api, name) {
      self.data[name] = null;
    });

    // null-out the stuff in db_project
    self.name = null;
    self.url = null;
    self.creds = null;
    self.id = null;
    self.devops_json = null;
    self.updated_at = null;

    _.each(project, function(val, key){
      self[key] = val;
    });

    self.crawl(function (err, results) {
      self.load_devops();
      self.install_pollers();
      self.install_hooks();
    });
  },
  crawl: function(cb) {
    var self = this;
    var options, parsed_url;

    parsed_url = url.parse(self.url);
    options = {
      host: parsed_url.host,
      port: 443,
      path: parsed_url.path,
      timeout: 11 * 1000,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (parsed_url.port) {
      options.port = parsed_url.port;
    }
    else if (parsed_url.protocol) {
      options.port = {'https:': 443, 'http:': 80}[parsed_url.protocol] || options.port;
    }

    utils.request_maker(options, function (err, results) {
      self.crawled_at = new Date();
      if (err) {
        self.crawl_err = err;
      }
      else if (results && results.data) {
        self.crawl_err = null;
        try {
          JSON.parse(results.data);
        } catch (e) {
          self.crawl_err = e;
          debugger;
          return cb(err, results);
        }
        return self.update(undefined, undefined, undefined, results.data, undefined, cb);
      }
      else {
        self.crawl_err = "No data when crawling";
      }
      return cb(err, results);
    });
  },
  load_devops: function(){
    var self = this;
    var devops_json;

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
            self.needs_creds = true;
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
  },
  install_hooks: function() {
    var self = this;
    log.log("Installing hooks...");

    var devops = self.devops;
    if (!devops || !devops.related_apis) {
      return;
    }

    _.each(hooks, function (hook, name) {
      if (!devops.related_apis[name]) {
        return;
      }
      hook.install(devops.related_apis[name], self.name, function(err, results){
        if (err){
          log.error(err, 'installing hook', name);
        }
      });
    });
  },
  install_pollers: function(cb){
    log.log("Installing pollers...");
    var self = this;

    var poll_intervals = [];
    var pollers = {};
    var related_api_name;
    var poller_series = [];
    var i;
    var _pollers;

    _.each(POLLING_APIS, function(poller_obj, poller_name){
      var poller_config = {};
      var poller;
      self.pollers[poller_name] = null;

      // build configs for the poller
      _.each(poller_obj.related_apis, function (api_name) {
        // does the project support this api?
        if (!self.devops || !self.devops.related_apis || !self.devops.related_apis[api_name]) {
          return;
        }
        poller_config[api_name] = self.devops.related_apis[api_name];
      });

      // no api in the devops when we expected one
      if (poller_obj.related_apis.length > 0 && _.keys(poller_config).length <= 0) {
        return;
      }

      poller = new Poller(poller_name, poller_obj.poller, poller_config, self);
      self.pollers[poller_name] = poller;
      self.data[poller_name] = {
        get_data: function () {
          return self.data[poller_name].data;
        },
        get_err: function () {
          return self.data[poller_name].err;
        },
        get_config: function () {
          return poller.get_config();
        }
      };

      poll_intervals.push(poller.poll_interval);
      pollers[poller_obj.priority] = pollers[poller_obj.priority] || [];

      pollers[poller_obj.priority].push(function(cb){
        poller.poll(cb);
      });
    });

    _.each(PRIORITIES, function(priority){
      poller_series.push(function(cb){
        async.parallel(pollers[priority], function(err, results){
          if (err){
            log.error(err);
          }
          cb(null, results);
        });
      });
    });

    var call_pollers = function(cb) {
      async.series(poller_series, function(err, results){
        if (err){
          log.error(err);
        }
        if (cb) {
          cb(err);
        }
      });
    };

    call_pollers(cb);

    if (self.interval_id !== null) {
      clearInterval(self.interval_id);
      self.interval_id = null;
    }
    self.interval_id = setInterval(call_pollers, _.min(poll_intervals));
  },
  update: function(id, name, url, devops_json, creds_json, cb) {
    var self = this;
    var update = false;

    if (id !== undefined && id !== self.id) {
      return (cb ? cb("Bad project ID", self) : undefined);
    }

    if (name !== undefined && self.name !== name) {
      update = true;
    } else if (url  !== undefined && self.url !== url) {
      update = true;
    } else if (creds_json !== undefined && !_.isEqual(JSON.parse(creds_json), self.creds)) {
      update = true;
    } else if (devops_json !== undefined && !_.isEqual(JSON.parse(devops_json), JSON.parse(self.devops_json))) {
      update = true;
    }

    if (update !== true) {
      return (cb ? cb() : undefined);
    }

    db.update_project(id, name, url, devops_json, creds_json, function (err) {
      if (name !== undefined && self.name !== name) {
        PROJECTS[name] = self;
        self.name = name;
        delete PROJECTS[self.name];
      }
      self.url = url !== undefined ? url : self.url;
      self.devops_json = devops_json !== undefined ? devops_json : self.devops_json;
      self.creds = creds_json !== undefined ? creds_json : self.creds;

      self.load_devops(self);
      self.install_pollers(cb);
      self.install_hooks();
    });
  },
  set_data: function(poller_name, err, data) {
    var self = this;
    // catch everything, cb must fire!
    try{
      if (err) {
        log.error(err);
      }
      self.data[poller_name].err = err;
      if (data !== undefined){
        self.data[poller_name].data = data;
      }
      self.data[poller_name].last_poll_end = new Date().valueOf();
    }catch(e){
      log.error(e);
    }
  },
  get_api_config: function (poller_name) {
    var self = this;
    return self.pollers[poller_name].get_config();
  }
});

exports.Project = Project;

