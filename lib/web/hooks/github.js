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
var path = require('path');
var fs = require('fs');

var async = require('async');
var _ = require('underscore');

var settings = require('../../settings');
var utils = require('../../utils');

// makes an options object to request something from the github v3 api
var github_request = utils.make_class({
  init: function(github_spec, method, id){
    var self = this;
    self.method = method;
    // TODO: safify
    self.path = util.format("/repos/%s/%s/hooks", github_spec.org, github_spec.repo);
    if (id){
      self.path += '/' + id;
    }
    self.headers = {
      'Authorization': utils.create_basic_auth(github_spec.username, github_spec.apikey)
    };
  },
  host: "api.github.com"
});

exports.install = utils.make_class({
  init: function(api_config, cb){
    var self = this;

    self.devops = api_config;
    self.project_name = api_config.project;

    // do stuff (after binding to self)
    async.waterfall([
      _.bind(get_hooks, self),
      _.bind(delete_hooks, self),
      _.bind(add_hook, self),
      _.bind(parse_response, self)
    ], cb);
  },
  get_api_url: function(repo){
    var self = this;
    var project_name;
    _.each(self.devops, function(devops, name){
      if (devops.github.repo === repo){
        project_name = name;
      }
    });
    return util.format("http://%s:%s/api/github/%s",
      settings.external_ipv4,
      settings.listen_port,
      project_name);
  },
  events: "pull_request"
});

var get_hooks = function(callback){
  var self = this;
  var list_hooks = {};
  var options;
  options = new github_request(self.devops, "GET");

  utils.request_maker(options, callback);
};

var delete_hooks = function(result, callback){
  var self = this;
  var to_delete = [];
  var to_keep = [];
  // look at http status
  if (result.res.statusCode === 401){
    throw new Error('Your config is probably wrong for github- they don\'t like your creds.'+
      JSON.stringify(result.data));
  }else if (result.res.statusCode === 404){
    throw new Error('Your config is probably wrong for github repos- they don\'t know it exists?');
  }
  // iterate through the hooks list for a given org/repo
  _.each(JSON.parse(result.data), function(hook){
    var options;
    var delete_hook = true;
    if (hook.message){
      throw new Error('Error: github says -> ' + hook.message);
    }
    // if the hook matches one we'd want to make, make sure its kosher
    if (hook.config.url === self.get_api_url(self.devops.repo)){
      // have we seen it before (sometimes dead ones pile up)
      if (_.indexOf(to_keep, hook.config.url) !== -1){
        console.log("DELETEing hook: " + hook.url, " because its a dup");
      } else if (hook.active !== true){
        console.log("DELETEing hook: " + hook.url, " because its not active");
      } else if (hook.name !== 'web'){
        console.log("DELETEing hook: " + hook.url, " because its not named 'web'");
      } else if(_.indexOf(hook.events, self.events) === -1){
        console.log("DELETEing hook: " + hook.url,
          " because its not listening to pull_requests");
      } else if(hook.last_response.status !== "unused" && hook.last_response.status !== "ok"){
        console.log("DELETEing hook: " + hook.url, " because its " + hook.last_response.status);
      } else{
        delete_hook = false;
      }
      if (!delete_hook){
        console.log("\n\nKEEPing hook: " + JSON.stringify(hook)+'\n\n');
        to_keep.push(hook.config.url);
      }else{
        options = new github_request(self.devops, "DELETE", hook.id);
        to_delete.push(function(cb){
          utils.request_maker(options, cb);
        });
      }
    }
  });
  async.parallel(to_delete, function(err, results){
    callback(err, result, to_keep);
  });
};
var add_hook = function(results, existing_hooks, callback){
  var options;
  var self = this;
  var url;

  url = self.get_api_url(self.devops.repo);
  // if we already have a hook for this repo, skip it
  if (_.indexOf(existing_hooks, url) !== -1){
    callback(null, null);
  }
  // otherwise, lets make a new hook
  options = github_request(self.devops, "POST");
  options.headers['Content-Type'] = 'application/json';
  options.post_data = {
    name: "web",
    active: true,
    events: [self.events],
    config: {
      url: url,
      content_type: "json"
    }
  };
  utils.request_maker(options, callback);
};
var parse_response = function(result, callback){
  var data = JSON.parse(result.data);
  var err = null;

  if (data.message) {
    err = data.message;
  }

  callback(err, data);
};