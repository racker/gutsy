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

exports.install = function(devops){
  _.each(devops, function(devop, name){
    var v1_spec = devop.version_one;
    var date;
    db.get_previous_v1_poll_date(v1_spec.project, function(err, results){
      if (results && results.rows.length >=1){
        date = results.rows[0].date.toISOString();
      }
      v1_spec.project_name = name;
      poller(date, v1_spec);
    });
  });
};

function parse(data, callback){
  var new_events = [];
  if (data.res.statusCode != 200){
    return console.log(data.data);
  }
  var etree = et.parse(data.data);
  if (!_.isEmpty(data.error)){
    return console.log("no data");
  }

  assets = etree.getroot().findall('./Asset');
  _.each (assets, function(asset) {
    var create_date, user;
    var status = EVENTS.none;
    _.each(asset._children, function(child){
      var name = child.attrib.name;
      switch(name){
        case "CreateDate":
          create_date = (new Date(child.text)).valueOf();
          break;
        case "ChangedBy.Nickname":
          user = child.text;
          break;
        case "AssetState":
          if (child.text === '64'){
            status = EVENTS.v1_active;
          } else if (child.text === '128'){
            status = EVENTS.v1_closed;
          }
          break;
      }
    });
    new_events.push(V1_Event(user, status, 100, create_date));
  });
  console.log(new_events);
  callback(null, new_events);
}

function _store(project_name, events, callback){
  if (events.length >= 1){
    console.log("adding "+events.length+" events from V1.");
  }
  db.add_multiple_events(events, project_name);
  callback();
}

var poller = function(start_time, v1_spec){
  var options, request, path;
  var end_time = new Date().toISOString();
  path = ['/',
    v1_spec.name,
    "/rest-1.v1/Data/Defect?sel=",
    selection,
    "&where=AssetState='64','128';Scope='Scope:",
    v1_spec.project,
    "';CreateDate<'",
    end_time,
    "'"];

  if (start_time){
    path.push(";CreateDate>='");
    path.push(start_time);
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
      db.set_previous_v1_poll_date(v1_spec.project, end_time, function(err, results){
        setTimeout(poller, 1000*60*10, end_time, v1_spec);
        if(err){
          console.error(err);
        }
      });
    });
};
