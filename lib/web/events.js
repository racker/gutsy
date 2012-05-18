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

// events to multipliers
exports.EVENTS = {
  none: 0,
  v1_active: 100,
  v1_closed: 50,
  merged: 500,
  commits_merged: 100,
  reopened: -1,
  closed: 11,
  sync: 3
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

var __Event = utils.make_class({
  init: function(version_one_username, github_username, status, related_api, story_points, date, url, title, details){
    var self = this;
    self.multiplier = status;
    self.date = date ? new Date(date) : new Date();
    self.story_points = story_points || 1;
    self.related_api = RELATED_APIS[related_api];
    self.title = title;
    self.url = url;
    if (!self.related_api){
      throw(new Error('unknown related api ' + related_api));
    }
    self.user = version_one_username || github_username;
    self.details = details;
  },
  get_points: function(){
    var self = this;
    return self.multiplier * self.story_points || 0;
  }
});

exports.Git_Event = function(user, status, story_points, date, details){
  var url;
  var title = "Github";
  return new __Event(null, user, status, RELATED_APIS.github, story_points, date, url, title, details);
};

exports.V1_Event = function(api_config, v1_asset, story_points){
  var create_date = new Date(v1_asset.attributes.CreateDate).valueOf();
  var user = v1_asset.attributes['ChangedBy.Name'];
  var v1_status = v1_asset.attributes.AssetState;
  var status;
  var url;
  var title;

  if (v1_status === '64'){
    status = exports.EVENTS.v1_active;
  } else if( v1_status === '128'){
    status = exports.EVENTS.v1_closed;
  } else{
    status = exports.EVENTS.none;
  }
  title = v1_asset.id;
  url = utils.v1_id_to_url(api_config, v1_asset.id);

  return new __Event(user, null, status, RELATED_APIS.version_one,
    story_points, create_date, url, title, v1_asset);
};
