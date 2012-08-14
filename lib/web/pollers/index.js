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
var path = require('path');
var fs = require('fs');

var _ = require('underscore');

var REQUIRED_FIELDS = ["name", "related_apis", "priority", "worker", "poll_interval"];
var priorities = [];
// give a default min in case none are defined
var poll_intervals = [5 * 60 * 1000];
var polling_apis = {};
var pollers = fs.readdirSync(__dirname);
// Drop index.js (or whatever it may be called in the future) from the import list
pollers.remove(pollers.indexOf(path.basename(__filename)));

_.each(pollers, function(poller_name){
  var poller;
  var has_req_fields = true;
  try{
    poller = require("./" + poller_name);
  } catch (e){
    return;
  }
  _.each(REQUIRED_FIELDS, function(field){
    if (!_.has(poller, field)){
      has_req_fields = false;
    }
  });
  if (!has_req_fields){
    return;
  }
  priorities.push(poller.priority);
  poll_intervals.push(poller.poll_interval);
  polling_apis[poller.name] = poller;
});

exports.PRIORITIES = _.uniq(priorities);
exports.POLLING_APIS = polling_apis;
exports.POLL_INTERVAL = _.min(poll_intervals);