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
var express = require('express');
var url = require('url');

var _ = require('underscore');
var async = require('async');
var et = require('elementtree');

var urls = require('../urls');
var db = require('../db');
var log = require('../../log');
var utils = require('../../utils/common');
var settings = require('../../settings');
var events = require('../events');
var middleware = require('../middleware');

var EVENTS = events.EVENT_TYPES;
var RELATED_APIS = events.RELATED_APIS;

exports.install = function(app, devops){

  var v1_request = function(project, title, cb){
    var options;
    var path;
    var v1_spec;
    var split;
    var str_number;
    var str_number_id;

    var v1_info = utils.version_one_match(title);
    if (!v1_info){
      return cb(null, null);
    }

    v1_spec = devops[project].version_one;

    path = ['/',
      v1_spec.name,
      "/rest-1.v1/Data/",
      v1_info.long_name,
      util.format("?sel=Estimate&where=Number='%s'", v1_info.number)
    ];

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
    utils.request_maker(options, cb);
  };

  var github_commits_request = function(project, pull_request_url){
    var github_spec = devops[project].github;
    var options;
    var parsed_url = url.parse(pull_request_url);
    options = {
      host: parsed_url.host,
      path: parsed_url.path+'/commits',
      port: 443,
      headers: {
        'Authorization': utils.create_basic_auth(github_spec.username, github_spec.apikey)
      }
    };
    return function (cb) {
      utils.request_maker(options, cb);
    };
  };

  app.use(express.errorHandler({ showStack: true, dumpExceptions: true }));

  app.post(urls.GITHUB_PUSH_API, [express.bodyParser()], function(req, res){
    var state;
    var number_matches;
    var str_number;
    var title;
    var merged_by_user;
    var project;
    var event;
    // any http requests we need to send off
    var requests = {};
    // any new events to add
    var events_list = [];
    var github_request;
    var body = req.body;
    var action = body.action;
    var pr = body.pull_request;
    var user = pr.user.login;

    project = req.params.project;
    if (!devops[project]){
      return res.send('404', 404);
    }
    res.send('', 204);

    log.log("new request from github", action, pr.title, pr.user.login, body.sender.login,
      pr.merged, pr.merged_by);

    if (action === "reopened"){
      requests.pr_close_user = function (cb) {
        db.get_pr_close_user(pr.id, RELATED_APIS.github, cb);
      };
    }

    if (pr.merged) {
      // get all the committers
      github_request = github_commits_request(project, pr.url);
      if (github_request){
        requests.github = github_request;
      }
    }

    // look up story points
    requests.version_one = function(cb){
      async.waterfall([
        function(cb){
          v1_request(project, pr.title, cb);
        },
        function(data, cb){
          if (data && data.data) {
            return utils.parse_v1(data.data, cb);
          }
          cb(null, null);
        },
        function(asset, cb){
          if (asset && asset.length > 0 && asset[0].attributes.Estimate.text){
            return cb(null, asset[0].attributes.Estimate.text);
          }
          return cb(null, null);
      }], cb);
    };

    async.parallel(requests, function(err, results){
      var asset;
      var committers=[];
      var event_type = null;
      var json;
      var new_estimate;
      var story_points = 1;

      // try to get story points out
      if (results.version_one){
        story_points = results.version_one;
      }

      // pr_close_user is the username of the person who closed the now-being-reopened pull request
      if (results.pr_close_user) {
        user = results.pr_close_user.user;
        event = events.Git_Event(user, EVENTS.reopened, story_points, pr);
        return db.add_event(event, project);
      }

      if (action === "synchronize") {
        event_type = EVENTS.sync;
      }
      if (action === "closed" && pr.merged === false){
        user = body.sender.login;
        event_type = EVENTS.closed;
      }
      if (action === "opened"){
        event_type = EVENTS.opened;
      }
      if (event_type !== null) {
        events_list.push(events.Git_Event(user, event_type, story_points, pr));
      }

      // loop over committers and the like
      if (pr.merged_by){
        events_list.push(events.Git_Event(pr.merged_by.login, EVENTS.merged, story_points, pr));

        json = JSON.parse(results.github.data);
        _.each(json, function(commit){
          try{
            committers.push(commit.committer.login);
          }catch(e){}
        });
        committers = _.uniq(committers);
        log.log(committers);

        _.each(committers, function(git_user){
          events_list.push(events.Git_Event(git_user, EVENTS.commits_merged, story_points, pr));
        });
      }

      return db.add_multiple_events(events_list, project);
    });
  });
};