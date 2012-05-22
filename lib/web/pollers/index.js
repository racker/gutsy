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

var Poller = require('./base').Poller;

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

var _install_api = function(poller){
  var call_api = function(){
    poller.poll();
  };
  // need to prepopulate the api caches
  to_call.push(function(cb){
    call_api();
    // NOTE: we don't make users wait for all api calls to finish, just to start
    cb();
    setInterval(call_api, payload.config.poll_interval || 5*60*1000);
  });
};

exports.install = function(devops, cb){
  var polling_data = {};
  var projects = _.keys(settings.devopsjson_uris);

  // TODO: throw everything in devops. ditch polling_data and payload.config
  _.each(projects, function(project){
    var polling_api;
    var poller;
    var name;
    var project_poller;
    var related_api_name;
    var api_config;

    if (!polling_data[project]){
      polling_data[project] = {};
    }
    project_poller = polling_data[project];

    for (name in polling_apis){
      polling_api = polling_apis[name];
      project_poller[name] = null;
      related_api_name = poller_to_relatedapi[name];
      if (!devops[project].related_apis || !devops[project].related_apis[related_api_name]) {
        continue;
      }
      api_config = devops[project].related_apis[related_api_name];
      api_config.project_name = project;
      poller = new Poller(name, polling_api, api_config);//{error: null, data: null, config: null};

      _install_api(poller);
    }
  });

  async.parallel(to_call, function(err, results){
    cb(err, polling_data);
  });
};