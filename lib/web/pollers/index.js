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

var polling_apis = {
  // independent devops middleware:
  pager_duty: require('./pager_duty'),
  version_one: require('./version_one'),
  github: require('./github'),
  new_relic: require('./new_relic'),
  dreadnot: require('./dreadnot'),
  highscores: require('./highscores'),
  burndown: require('./burndown')
};

var poller_to_relatedapi = {highscores: 'version_one', burndown: 'version_one'};

// defaults to its own name
_.each(polling_apis, function(val, name){
  if (!poller_to_relatedapi[name]){
    poller_to_relatedapi[name] = name;
  }
});

var to_call = [];

var __install_poller = function(API, payload){
  var poller;
  try{
    poller = new API(payload);
    poller.poll(0);
  }catch (e){
    console.log("error installing api: ", payload.config, e.stack);
    payload.error = e;
  }
};

exports.install = function(devops, cb){
  var polling_data = {};
  var projects = _.keys(settings.devopsjson_uris);

  // TODO: throw everything in devops. ditch polling_data and payload.config
  _.each(projects, function(project){
    var api;
    var name;
    var this_devops;
    var payload;
    var related_api_name;
    for (name in polling_apis){
      api = polling_apis[name];
      this_devops = devops[project];
      if (!polling_data[project]){
        polling_data[project] = {};
      }
      //TODO: change payload to use setters/getters and freeze it to avoid accidentally setting errors/err, etc
      payload = {error: null, data: null, config: null};
      polling_data[project][name] = payload;
      related_api_name = poller_to_relatedapi[name];
      if (!this_devops.related_apis || !this_devops.related_apis[related_api_name]) {
        continue;
      }

      payload.config = this_devops.related_apis[related_api_name];
      payload.config.project_name = project;
      __install_poller(api, payload);
    }
  });

  async.parallel(to_call, function(err, results){
    cb(err, polling_data);
  });
};