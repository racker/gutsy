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
var PRIORITIES = [];
// give a default min in case none are defined
var INTERVALS = [5 * 60 * 1000];
var PLUGINS = {};
var plugins = fs.readdirSync(__dirname);
// Drop index.js (or whatever it may be called in the future) from the import list
plugins.remove(plugins.indexOf(path.basename(__filename)));

_.each(plugins, function(module_name){
  var plugin;
  var has_req_fields = true;
  try{
    plugin = require("./" + module_name);
  } catch (e){
    return;
  }
  _.each(REQUIRED_FIELDS, function(field){
    if (!_.has(plugin, field)){
      has_req_fields = false;
    }
  });
  if (!has_req_fields){
    return;
  }
  PRIORITIES.push(plugin.priority);
  INTERVALS.push(plugin.poll_interval);
  PLUGINS[plugin.name] = plugin;
});

exports.PLUGINS = PLUGINS;
exports.PRIORITIES = _.uniq(PRIORITIES);
exports.INTERVALS = _.min(INTERVALS);