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

var util = require('util');

var async = require('async');
var _ = require('underscore');
var et = require('elementtree');

var db = require('../db');
var settings = require('../../settings');
var utils = require('../../utils');
var events = require('../events');

var V1_Event = events.V1_Event;
var EVENTS = events.EVENTS;
var selection = ["ChangedBy",
                "CreateDate",
                "Owners",
                "AssetState",
                "AssetType",
                "Priority"];

module.exports = function(v1_spec){
  v1_spec = v1_spec.config;
  db.get_last_v1_time(v1_spec.project_name, function(err, date){
    if (err) {
      utils.die(err);
    }
    poller(date, v1_spec);
  });
};

function parse(data, callback){
  var new_events = [];

  utils.parse_v1(data.data, function(error, assets){
    if (error){
      return callback(error, null);
    }
    _.each(assets, function(asset){
      new_events.push(V1_Event(asset, 100));
    });
    callback(null, new_events);
  });
}

function _store(project_name, events, callback){
  db.add_multiple_events(events, project_name);
  callback();
}

var poller = function(start_time, v1_spec){
  var options, request, path, store;
  path = ['/',
    v1_spec.name,
    "/rest-1.v1/Data/Defect?sel=",
    selection,
    "&where=AssetState='64','128';Scope='Scope:",
    v1_spec.project,
    "'"];

  if (start_time){
    path.push(";CreateDate>'");
    path.push(start_time.toISOString());
    path.push("'");
  }

  options = {
    port: v1_spec.port,
    host: v1_spec.host,
    path: encodeURI(path.join("")),
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + new Buffer(v1_spec.auth).toString('base64')
    }
  };

  // bind options so the request maker just takes the cb from async
  request = _.bind(utils.request_maker, {}, options);
  // bind the project :(
  store = _.bind(_store, {}, v1_spec.project_name);

  async.waterfall([
    request,
    parse,
    store],
    function(err, data){
      if(err){
        console.error(err);
      }
    });
};
