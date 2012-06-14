/*
 *  Copyright 2011 Rackspace
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

var _ = require('underscore');
var async = require('async');

var settings = require('../../settings');
var log = require('../../log');

var Poller = require('./base').Poller;

var priorities = [];

var poller_factory = function(name, related_apis, priority){
  related_apis = related_apis || [name];
  priority = priority === undefined ? 1 : priority;
  priorities.push(priority);

  return {
    name: name,
    poller: require("./"+name),
    related_apis: related_apis,
    priority: priority
  };
};

var _polling_apis = {
  crawler: ['crawler', [], 0],
  // independent devops middleware:
  pager_duty: ['pager_duty'],
  version_one: ['version_one'],
  github: ['github'],
  new_relic: ['new_relic'],
  dreadnot: ['dreadnot'],
  highscores: ['highscores', ['version_one']],
  burndown: ['burndown', ['version_one']],
  service_health: ['service_health', []],
  release_notes: ['release_notes', ['github', 'version_one', 'dreadnot'], 2]
};

var polling_apis = {};
_.each(_polling_apis, function(args, name){
  polling_apis[name] = poller_factory.apply(null, args);
});

priorities = _.uniq(priorities);

var INTERVAL_IDS = {};

var uninstall = function(project_id){
  if (INTERVAL_IDS[project_id] !== undefined) {
    clearInterval(INTERVAL_IDS[project_id]);
    delete INTERVAL_IDS[project_id];
  }
};

exports.uninstall = uninstall;

exports.install = function (project) {
  log.log("Installing pollers...");

  var poll_intervals = [];
  var pollers = {};
  var related_api_name;
  var devops = project.devops;
  var poller_series = [];
  var i;
  var _pollers;
  var poll_interval;

  if (!project.pollers){
    project.pollers = {};
  }

  uninstall(project.name);

  _.each(polling_apis, function(poller_obj, poller_name){
    var poller_config = {};
    var poller;
    project.pollers[poller_name] = null;

    // build configs for the poller
    _.each(poller_obj.related_apis, function (api_name) {
      // does the project support this api?
      if (!devops || !devops.related_apis || !devops.related_apis[api_name]) {
        return;
      }
      // give the poller
      poller_config[api_name] = devops.related_apis[api_name];
    });

    // no api in the devops when we expected one
    if (poller_obj.related_apis.length > 0 && _.keys(poller_config).length <= 0) {
      return;
    }

    poller = new Poller(poller_name, project.name, poller_obj.poller, poller_config);
    project.pollers[poller_name] = poller;

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
  INTERVAL_IDS[project.id] = setInterval(call_pollers, poll_interval);
};