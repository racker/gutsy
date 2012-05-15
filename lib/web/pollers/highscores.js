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

var SELECTION = ["ChangedBy",
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
    Poller(date, v1_spec);
  });
};

var Poller = utils.make_class({
  init: function (start_time, v1_spec) {
    var self = this;
    self.v1_spec = v1_spec;
    self.start_time = start_time;

    // bind options so the request maker just takes the cb from async
    async.waterfall([
      _.bind(self._request, self),
      _.bind(self._parse, self),
      _.bind(self._store, self)],
      function(err, data){
        if(err){
          console.error(err);
        }
      }
    );
  },
  _request: function (cb) {
    var self = this;
    var options, path;

    path = ['/',
      self.v1_spec.name,
      "/rest-1.v1/Data/Defect?sel=",
      SELECTION,
      "&where=AssetState='64','128';Scope='Scope:",
      self.v1_spec.project,
      "'"];

    if (self.start_time){
      path.push(";CreateDate>'");
      path.push(self.start_time.toISOString());
      path.push("'");
    }

    options = {
      port: self.v1_spec.port,
      host: self.v1_spec.host,
      path: encodeURI(path.join("")),
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + new Buffer(self.v1_spec.auth).toString('base64')
      }
    };
    utils.request_maker(options, cb);
  },
  _parse: function (data, callback) {
    var self = this;
    var v1_spec = self.v1_spec;
    var new_events = [];

    utils.parse_v1(data.data, function(error, assets){
      if (error){
        return callback(error, null);
      }
      // V1 is not precise at all with date comparisons...
      _.each(assets, function(asset){
        if (Date.parse(asset.attributes.CreateDate) > self.start_time.valueOf()){
          new_events.push(V1_Event(self.v1_spec, asset, 100));
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
    db.add_multiple_events(events, self.v1_spec.project_name);
    callback();
  }
});


