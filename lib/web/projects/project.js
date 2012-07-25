var _ = require('underscore');
var path = require('path');
var async = require('async');
var emitter = require('events').EventEmitter;
var url = require('url');

var settings = require('../../settings');
var utils = require('../../utils').common;
var constants = require('../../utils').constants;
var log = require('../../log');
var db = require('../db');
var pollers = require('../pollers');
var PRIORITIES = pollers.PRIORITIES;
var POLLING_APIS = pollers.POLLING_APIS;
var POLL_INTERVAL = pollers.POLL_INTERVAL;
var Poller = pollers.Poller;

var hooks = require('../hooks').hooks;

var make_defaults = function(devops_json){
  return _.defaults(devops_json, {
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
  });
};

var Project = utils.make_class({
  init: function (project) {
    var self = this;
    self.hooks = [];
    self.pollers = {};
    self.poller_interval_id = null;
    self.crawler_interval_id = null;
    self.devops = null;
    self.needs_creds = false;
    self.crawled_at = new Date(0);
    self.crawl_err = null;
    // null-out the stuff in db_project
    self.name = null;
    self.url = null;
    self.id = null;
    self.devops_json = null;
    self.updated_at = null;
    self.data = {};
    _.each(POLLING_APIS, function (polling_api, name) {
      self.data[name] = null;
    });
    _.each(project, function(val, key){
      self[key] = val;
    });
    self.creds = project.creds ? JSON.parse(project.creds) : {};
  },
  start: function(cb){
    var self = this;
    async.series([
      _.bind(self.install_crawler, self),
      _.bind(self.crawl, self),
      _.bind(self.load_devops, self),
      _.bind(self.install_pollers, self),
      _.bind(self.install_hooks, self)
      ], function(err, results){
        if (err){
          log.error(err);
        }
        cb(err, self);
    });
  },
  install_crawler: function(cb){
    var self = this;
    self._uninstall_crawler();

    self.crawler_interval_id = setInterval(function(){
      self.crawl(function(){});
    }, 10*60*1000);
    cb();
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
        return cb(err);
      }
      if (results && results.data) {
        self.crawl_err = null;
        try {
          JSON.parse(results.data);
        } catch (e) {
          self.crawl_err = "Error parsing your devops.json: " + e.toString();
          return cb();
        }
        return self.update(undefined, undefined, undefined, results.data, undefined, cb);
      }
      self.crawl_err = "No data when crawling";
      return cb();
    });
  },
  load_devops: function(cb){
    var self = this;
    var devops_json;
    self.needs_creds = false;

    devops_json = self.devops_json ? JSON.parse(self.devops_json): {};

    // fill in missing optional fields
    devops_json = make_defaults(devops_json);

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
    if (devops_json.related_apis.version_one !== undefined) {
      devops_json.related_apis.version_one.project = [].concat(devops_json.related_apis.version_one.project);
    }
    self.devops = devops_json;
    cb();
  },
  install_hooks: function(cb) {
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
      hook.install(devops.related_apis[name], self, function(err, hook){
        self.hooks.push(hook);
      });
    });
    cb();
  },
  _make_pollers: function(){
    var self = this;
    var pollers = {};

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

      pollers[poller_obj.priority] = pollers[poller_obj.priority] || [];

      pollers[poller_obj.priority].push(function(cb){
        poller.poll(cb);
      });
    });
    return pollers;
  },
  install_pollers: function(cb){
    log.log("Installing pollers...");
    var self = this;
    var poller_series = [];
    var call_pollers;
    var pollers = self._make_pollers();

    _.each(PRIORITIES, function(priority){
      if (pollers[priority] === undefined){
        return;
      }
      poller_series.push(function(cb){
        async.parallel(pollers[priority], function(err, results){
          if (err){
            log.error(err);
          }
          cb(null, results);
        });
      });
    });

    call_pollers = function(cb) {
      async.series(poller_series, function(err, results){
        if (err){
          log.error(err);
        }
        if (cb) {
          cb(err);
        }
      });
    };

    self._uninstall_pollers();
    call_pollers();
    self.poller_interval_id = setInterval(call_pollers, POLL_INTERVAL);
    cb();
  },
  update: function(id, name, url, devops_json, creds, cb) {
    var self = this;
    var update = false;
    var creds_json;
    var should_crawl_now = false;
    var reply = function(err){
      return cb(err, self);
    };

    if (id !== undefined && id !== self.id) {
      return reply("Bad project ID");
    }

    if (creds !== undefined){
      creds = _.defaults(creds, self.creds);
    }
    if (name !== undefined && self.name !== name) {
      update = true;
    } else if (url  !== undefined && self.url !== url) {
      update = true;
      should_crawl_now = true;
    } else if (creds !== undefined && !_.isEqual(creds, self.creds)) {
      update = true;
      creds_json = JSON.stringify(creds);
    } else if (devops_json !== undefined && !_.isEqual(JSON.parse(devops_json), JSON.parse(self.devops_json))) {
      update = true;
    }
    if (update !== true) {
      return reply(null);
    }

    db.update_project(id, name, url, devops_json, creds_json, function (err) {
      if (err){
        return reply(err);
      }
      self.name = name !== undefined ? name : self.name;
      self.url = url !== undefined ? url : self.url;
      self.devops_json = devops_json !== undefined ? devops_json : self.devops_json;
      self.creds = creds !== undefined ? creds : self.creds;

      var actions = [
        _.bind(self.install_crawler, self),
        _.bind(self.load_devops, self),
        _.bind(self.install_pollers, self),
        _.bind(self.install_hooks, self)
      ];

      if (should_crawl_now) {
        actions = [function (cb) {
          return self.crawl(cb);
        }];
      }

      async.series(actions, function(err, results){
        return reply(err);
      });
    });
  },
  set_data: function(poller_name, err, data) {
    var self = this;
    if (err) {
      log.error(err);
    }
    self.data[poller_name].err = err;
    if (data !== undefined){
      self.data[poller_name].data = data;
    }
    self.data[poller_name].last_poll_end = new Date().valueOf();
  },
  get_api_config: function (poller_name) {
    var self = this;
    return self.pollers[poller_name] ? self.pollers[poller_name].get_config() : undefined;
  },
  get_data: function(poller_name){
    var self = this;
    return self.data[poller_name] ? self.data[poller_name].data : undefined;
  },
  _uninstall_pollers: function(){
    var self = this;
    if (self.poller_interval_id !== null) {
      clearInterval(self.poller_interval_id);
      self.poller_interval_id = null;
    }
  },
  _uninstall_crawler: function(){
    var self = this;
    if (self.crawler_interval_id !== null){
      clearInterval(self.crawler_interval_id);
      self.crawler_interval_id = null;
    }
  },
  _uninstall_hooks: function(){
    var self = this;
    
    _.each(self.hooks, function(hook, index){
      try{
        hook.uninstall();
      }catch(e){
        log.error(e, 'uninstalling a hook');
      }
    });
    self.hooks = [];
  },
  uninstall: function(){
    var self = this;
    self._uninstall_crawler();
    self._uninstall_pollers();
    self._uninstall_hooks();
  }
});

exports.Project = Project;

