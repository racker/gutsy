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

var utils = require('../utils');

var idjson = require('./load_idjson').load();

// events to multipliers
exports.EVENTS = {
  none: 0,
  v1_active: 200,
  v1_closed: 10,
  merged: 500,
  commits_merged: 100,
  reopened: -1
};

var RELATED_APIS = {};

Object.defineProperty(RELATED_APIS, "github", {
  value: 'github',
  writable: false,
  enumerable: true,
  configurable: false
});

Object.defineProperty(RELATED_APIS, "version_one", {
  value: 'version_one',
  writable: false,
  enumerable: true,
  configurable: false
});

Object.freeze(RELATED_APIS);
Object.seal(RELATED_APIS);
Object.preventExtensions(RELATED_APIS);

exports.RELATED_APIS = RELATED_APIS;

__Event = utils.make_class({
  init: function(version_one_username, github_username, status, related_api, story_points, date){
    var self = this;
    self.multiplier = status;
    self.date = date ? new Date(date) : new date();
    self.story_points = story_points || 1;
    self.related_api = RELATED_APIS[related_api];
    if (!self.related_api){
      throw(new Error('unknown related api ' + related_api));
    }
    self.user = version_one_username || github_username;
  },
  get_points: function(){
    var self = this;
    return self.multiplier * self.story_points || 0;
  }
});

exports.Git_Event = function(user, status, story_points, date){
  return new __Event(null, user, status, RELATED_APIS.github, story_points, date);
};

exports.V1_Event = function(user, status, story_points, date){
  return new __Event(user, null, status, RELATED_APIS.version_one, story_points, date);
};

// events to multipliers
exports.EVENTS = {
  none: 0,
  v1_active: 200,
  v1_closed: 10,
  merged: 500,
  commits_merged: 100,
  reopened: -1
};