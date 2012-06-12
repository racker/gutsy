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

var polling_apis = {
  // independent devops middleware:
  pager_duty: require('./pager_duty'),
  version_one: require('./version_one'),
  github: require('./github'),
  new_relic: require('./new_relic'),
  dreadnot: require('./dreadnot'),
  highscores: require('./highscores'),
  burndown: require('./burndown'),
  service_health: require('./service_health'),
  release_notes: require('./release_notes')
};

var poller_to_relatedapis = {
  highscores: ['version_one'],
  burndown: ['version_one'],
  release_notes: ['github', 'version_one', 'dreadnot'],
  service_health: null
};

// defaults to its own name
_.each(polling_apis, function (val, name) {
  if (poller_to_relatedapis[name] === undefined){
    poller_to_relatedapis[name] = [name];
  }
});

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

  var polling_api;
  var poller;
  var name;
  var poll_intervals = [];
  var pollers = [];
  var related_api_name;
  var api_config;
  var devops = project.devops;
  var project_name = project.name;

  uninstall(project_name);

  if (!project.pollers){
    project.pollers = {};
  }

  for (name in polling_apis){
    api_config = {};
    polling_api = polling_apis[name];
    project.pollers[name] = null;
    related_api_names = poller_to_relatedapis[name];
    if (related_api_names === null) {
      api_config = {project_name: project_name};
    }
    else {
      _.each(related_api_names, function (api_name, poller_name) {
        if (!devops || !devops.related_apis || !devops.related_apis[api_name]) {
          return;
        }
        api_config[api_name] = devops.related_apis[api_name];
        api_config[api_name].project_name = project_name;
      });
      if (Object.keys(api_config).length === 0) {
        continue;
      }
      else if (Object.keys(api_config).length === 1) {
        api_config = api_config[Object.keys(api_config)[0]];
      }
    }
    poller = new Poller(name, polling_api, api_config);

    project.pollers[name] = poller;
    poller.poll();

    poll_intervals.push(poller.poll_interval);
    pollers.push(function (cb){
      try {
        poller.poll();
      }
      catch (e) {
        log.error(e);
      }
      cb();
    });
  }

  if (pollers.length === 0) {
    return;
  }
  INTERVAL_IDS[project.id] = setInterval(function() {
    async.parallel(pollers, function(err, results){
      if (err){
        log.error(err);
      }
    });
  }, _.min(poll_intervals));
};
