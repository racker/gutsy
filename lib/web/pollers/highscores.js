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
var utils = require('../../utils').common;
var v1 = require('../../utils').v1;
var events = require('../events');

var V1_Event = events.V1_Event;
var EVENTS = events.EVENTS;

var SELECTION = ["ChangedBy",
                "CreateDate",
                "Owners",
                "AssetState",
                "AssetType",
                "Priority"];

var Poller = utils.make_class({
  init: function (start_time, payload) {
    var self = this;
    self.api_config = payload.get_config();
    self.project_name = payload.get_project_name();
    self.start_time = start_time;

    // bind options so the request maker just takes the cb from async
    async.waterfall([
      _.bind(self._request, self),
      _.bind(self._parse, self),
      _.bind(self._store, self)],
      function(err, data){
        payload.set_data(err);
      }
    );
  },
  _request: function (cb) {
    var self = this;
    var options, path;
    var scopes = v1.scope_maker(self.api_config.project);

    path = ["/Data/Defect?sel=",
      SELECTION,
      "&where=AssetState='64','128';Scope=",
      scopes];

    if (self.start_time){
      path.push(";CreateDate>'");
      path.push(self.start_time.toISOString());
      path.push("'");
    }
    options = v1.options(self.api_config, path);

    utils.request_maker(options, cb);
  },
  _parse: function (data, callback) {
    var self = this;
    var api_config = self.api_config;
    var new_events = [];

    v1.parse(data.data, function(error, assets){
      if (error){
        return callback(error, null);
      }
      // V1 is not precise at all with date comparisons...
      _.each(assets, function(asset){
        if (Date.parse(asset.attributes.CreateDate.text) > self.start_time.valueOf()){
          new_events.push(new V1_Event(self.api_config, asset));
        }
      });
      callback(null, new_events);
    });
  },
  _store: function (events, callback){
    var self = this;
    if (events.length<=0){
      return callback(null);
    }
    db.add_multiple_events(events, self.project_name);
    callback();
  }
});

function poller(payload){
  db.get_last_v1_time(payload.get_project_name(), function(err, date){
    if (err) {
      utils.die("Error getting last V1 time:", err);
    }
    return new Poller(date, payload);
  });
}

poller.poll_interval= 15 * 60 * 1000;

module.exports = poller;
