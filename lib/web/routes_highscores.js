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

var urls = require('./urls');
var db = require('./db');
var utils = require('../utils');
var settings = require('../settings');
var events = require('./events');

var EVENTS = events.EVENTs;

exports.install = function(app, devops){

  var v1_request = function(project, pull_request_title){
    var options, path, v1_spec, identifier_match, identifier;

    identifier_match = pull_request_title.match(/([B|D]\d{4,}){1}/);
    if (!identifier_match){
      throw Error('No match could be found for title: ' + pull_request_title);
    }

    identifier = identifier_match[0];

    split = identifier.split('-');
    if (split.length !== 2){
      throw Error('unknown identifier: ' + identifier);
    }

    type = split[0];
    if (type !== "B" && type !== "D"){
      throw Error('unknown asset type: ' + type);
    }

    str_number_id = split[1];
    // is this thing a number?
    if (str_number_id && str_number_id.length >= 4 && str_number_id.length <= 6){
      try{
        parseInt(str_number, 10);
      }catch(e){
        throw Error('unknown number id: ' + str_number_id);
      }
    }

    v1_spec = devops[project].version_one;

    path = ['/',
      v1_spec.name,
      "/rest-1.v1/Data/",
      type === "B" ? "Story" : "Defect",
      util.format("?sel=Estimate&where=Number='%s'", identifier)
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
    return _.bind(utils.request_maker, utils, options);
  };

  var github_commits_request = function(project, pull_request_url){
    github_spec = devops[project].github;
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
    var state, number_matches, str_number, title, merged_by_user, event;
    var story_points = 1;
    // any http requests we need to send off
    var requests = {};
    // any new events to add
    var events_list = [];

    res.send('', 204);

    var project = req.param.project;
    var e = req.body;
    var action = e.action;
    // look up story points
    title = e.pull_request.title;

    console.log("new request from github", action, title, e.pull_request.user.login, e.sender.login,
      e.pull_request.merged, e.pull_request.merged_by);

    if (action === "reopened"){
      event = Git_Event(e.pull_request.user.login, EVENTS.reopened, 500);
      return db.add_event(event);
    }

    if (action === "closed" && e.pull_request.merged === true){
      //TODO: this is fucking terrible variable spanning
      merged_by_user = e.pull_request.merged_by.login;
      // get all the committers
      requests.github = github_commits_request(project, e.pull_request.url);
    } else {
      return;
    }

    try{
      requests.version_one = v1_request(project, title);
    } catch(e){
      console.log(e.message);
    }

    async.parallel(requests, function(err, results){
      var committers=[];
      var json;
      var new_estimate;
      var asset;

      json = JSON.parse(results.github.data);
      _.each(json, function(commit){
        try{
          committers.push(commit.committer.login);
        }catch(e){}
      });
      comitters = _.uniq(comitters);
      console.log(committers);

      // try to get story points out
      if (results.version_one){
        var etree = et.parse(results.version_one.data);
        if (!_.isEmpty(data.error)){
          return;
        }
        asset = etree.getroot().findall('./Asset');
        if (asset && asset[0]._children[0].attrib.name === "Estimate")
          story_points = asset[0]._children[0].text || 1;
        }

      // loop over committers and the like
      if (merged_by_user){
        events_list.push(events.Git_Event(merged_by_user, EVENTS.merged, story_points));
      }
      _.each(comitters, function(git_user){
        events_list.push(events.Git_Event(git_user, EVENTS.commits_merged, story_points));
      });

      return db.add_multiple_events(events_list);
    });

  });

  app.get(urls.API, function(req, res){

    var project = req.params.project;
    var start_date = req.params.start;
    var end_date = req.params.end;
    var stats;

    db.get_stats(project, start_date, end_date, function(err, results){
      res.header('Content-Type', "application/json");
      if (results && results.rows){
        stats = JSON.stringify(results.rows);
      }
      console.log('stats request: ', stats);
      res.end(stats);
    });
  });
};