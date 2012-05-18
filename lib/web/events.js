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

var utils = require('../utils');

var _event_type_proto = {
  toString: function(){
    var self = this;
    return self.name;
  }
};
var _make_event_type = function(name, description, multiplier){
  var type = function(){
    this.name = name;
    this.description = description;
    this.multiplier = multiplier;
  };
  type.prototype = _event_type_proto;
  return new type();
};
var __EVENT_TYPES = [
  _make_event_type('v1_active', 'created ', 72),
  _make_event_type('v1_closed', 'closed ', 73),
  _make_event_type('v1_other', '??? ', 0),
  _make_event_type('merged', 'merged ', 500),
  _make_event_type('commits_merged', 'contributed to ', 100),
  _make_event_type('reopened', 'was reopened ', -255),
  _make_event_type('closed', 'closed ', 11),
  _make_event_type('sync', 'reviewed ', 21)
];
var EVENT_TYPES = {};
_.each(__EVENT_TYPES, function(event){
  EVENT_TYPES[event.name] = event;
});
exports.EVENT_TYPES = EVENT_TYPES;

exports.describe = function(event_name){
  return EVENT_TYPES[event_name].description;
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
  init: function(event, user, related_api, points, date, url, title, id){
    var self = this;
    self.event = event;
    self.date = date ? new Date(date) : new Date();
    self.points = points || 1;
    self.related_api = RELATED_APIS[related_api];
    self.title = title;
    self.url = url;
    if (!self.related_api){
      throw(new Error('unknown related api ' + related_api));
    }
    self.user = user;
    self.id = id;
  },
  get_points: function(){
    var self = this;
    return get_points(self.event, self.points) || 0;
  }
});

exports.Git_Event = function(user, event, points, pr){
  var date = pr.updated_at;
  return new __Event(event, user, RELATED_APIS.github, points, date, pr.html_url, pr.title, pr.id);
};

exports.V1_Event = function(api_config, v1_asset){
  var create_date = new Date(v1_asset.attributes.CreateDate).valueOf();
  var user = v1_asset.attributes['ChangedBy.Name'];
  var v1_status = v1_asset.attributes.AssetState;
  var event;
  var url;
  var title;

  if (v1_status === '64'){
    event = EVENT_TYPES.v1_active;
  } else if( v1_status === '128'){
    event = EVENT_TYPES.v1_closed;
  } else{
    event = EVENT_TYPES.v1_other;
  }
  title = v1_asset.id;
  url = utils.v1_id_to_url(api_config, v1_asset.id);

  return new __Event(event, user, RELATED_APIS.version_one,
    1, create_date, url, title, v1_asset.id);
};
