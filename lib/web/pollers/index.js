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

var Poller = require('./poller').Poller;

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

exports.polling_apis = polling_apis;

var INTERVAL_IDS = {};

var uninstall = function(project_id){
  if (INTERVAL_IDS[project_id] !== undefined) {
    clearInterval(INTERVAL_IDS[project_id]);
    delete INTERVAL_IDS[project_id];
  }
};

exports.uninstall = uninstall;
