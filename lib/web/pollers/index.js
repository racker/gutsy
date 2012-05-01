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
  release_notes: require('./release_notes')
};

// which apis does a given poller depend on?
var poller_to_relatedapi = {release_notes: 'github'};
// defaults to its own name
_.each(polling_apis, function(val, name){
  if (!poller_to_relatedapi[name]){
    poller_to_relatedapi[name] = name;
  }
});

var to_call = [];

var _install_api = function(api, payload){
  var call_api = function(){
    try{
      api(payload);
    }catch (e){
      payload.error = e;
    }
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
      _install_api(api, payload);
    }
  });

  async.parallel(to_call, function(err, results){
    cb(polling_data);
  });
};