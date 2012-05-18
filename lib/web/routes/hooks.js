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
var utils = require('../../utils');
var settings = require('../../settings');
var events = require('../events');
var middleware = require('../middleware');

var EVENTS = events.EVENTS;
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
      return;
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
      headers: utils.create_basic_auth(github_spec.username, github_spec.apikey)
    };

    return _.bind(utils.request_maker, utils, options);
  };

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
    var event_type = null;
    var story_points = 500;
    var body = req.body;
    var action = body.action;
    var pr = body.pull_request;
    var user = pr.user.login;

    project = req.params.project;
    if (!devops[project]){
      return res.send('404', 404);
    }
    res.send('', 204);

    console.log("new request from github", action, pr.title, pr.user.login, body.sender.login,
      pr.merged, pr.merged_by);

    if (action === "synchronize") {
      event_type = EVENTS.sync;
      story_points = 1;
    }

    if (action === "closed" && pr.merged === false){
      event_type = EVENTS.closed;
      story_points = 500;
    }

    if (event_type !== null) {
      event = events.Git_Event(user, event_type, story_points, pr);
      return db.add_event(event, project);
    }

    if (action === "reopened"){
      return db.get_pr_close_user(pr.id, RELATED_APIS.github, function (err, results) {
        if (err) {
          console.error(err);
        }
        if (results) {
          user = results.username;
          event = events.Git_Event(user, EVENTS.reopened, 500, pr);
          db.add_event(event, project);
        }
      });
    }

    // get all the committers
    requests.github = github_commits_request(project, pr.url);
    // look up story points
    requests.version_one = function(cb){
      async.waterfall([
        function(cb){
          v1_request(project, pr.title, cb);
        },
        function(data, cb){
          utils.parse_v1(data, cb);
        },
        function(cb, asset){
          if (asset.attributes.Estimate){
            return cb(null, asset.attributes.Estimate);
          }
          return cb(null);
      }], cb);
    };

    async.parallel(requests, function(err, results){
      var committers=[];
      var json;
      var new_estimate;
      var asset;
      var story_points = 1;

      json = JSON.parse(results.github.data);
      _.each(json, function(commit){
        try{
          committers.push(commit.committer.login);
        }catch(e){}
      });
      committers = _.uniq(committers);
      console.log(committers);

      // try to get story points out
      if (results.version_one){
        story_points = results.version_one;
      }
      // loop over committers and the like
      if (pr.merged_by){
        events_list.push(events.Git_Event(pr.merged_by.login, EVENTS.merged, story_points, pr));
      }
      _.each(committers, function(git_user){
        events_list.push(events.Git_Event(git_user, EVENTS.commits_merged, story_points, pr));
      });

      return db.add_multiple_events(events_list, project);
    });
  });
};