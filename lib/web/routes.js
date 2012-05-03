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

var fs = require('fs');

var express = require('express');
var async = require('async');
var _ = require('underscore');

var urls = require('./urls');
var middleware = require('./middleware');
var settings = require('../settings');
var utils = require('../utils');
var Release_Notes_Worker = require('./release_notes_worker');

function get_devops(req, devops, api){
  var _devops = devops[req.params.project];
  if (!api){
    return _devops;
  }
  return _devops.related_apis[api];
}

module.exports.install = function(app, status_api, devops){
  app.get(
    '/favicon.ico',
    function(req, res) {
      res.send("favicon");
  });

  app.get(
    urls.DEFECTS,
    function(req, res) {
      res.render('defects.jade');
  });

  app.get(
    urls.DEVHEALTH,
    function(req, res) {
      res.render('devhealth.jade');
    });

  app.get(
    urls.RELEASE_NOTES,
    function(req, res) {
      res.render('release_notes.jade', {errors: null, notes: null});
  });

  app.post(
    urls.RELEASE_NOTES,
    [express.bodyParser()],
    function(req, res) {
      var context = {notes: [], errors: null};
      var start = req.body.start;
      var end = req.body.end;
      var worker;
      var v1_config;
      var github_config;

      if (!start || !end){
        context.errors = "Supply start and end!";
        return res.render('release_notes.jade', context);
      }
      context.start = start;
      context.end = end;
      try{
        context.start = new Date(start);
        context.end = new Date(end);
      }catch(e){
        context.errors = "I could not parse a date!" + e;
        return res.render('release_notes.jade', context);
      }
      if (start.toString() === 'Invalid Date' || end.toString() === 'Invalid Date'){
        context.errors = "I could not parse a date!";
        return res.render('release_notes.jade', context);
      }
      v1_config = get_devops(req, devops, 'version_one');
      github_config = get_devops(req, devops, 'github');

      worker = new Release_Notes_Worker(v1_config, github_config, context.start, context.end);
      worker.work(function(err, notes){
        if (err){
          context.errors = err;
        }
        context.notes = notes;
        context.v1_host = v1_config ? v1_config.host : null;
        res.render('release_notes.jade', context);
      });
  });

  app.get(
    urls.INDEX,
    function(req, res) {
      var project = get_devops(req, devops);
      var events = project.events;

      var max = 0;
      var event;

      var now = (new Date()).getTime();
      var future_events = [];
      for (var i=0; i<events.length; i++){
        event = events[i];
        if (_.isNull(event.timestamp)){
          continue;
        }
        // convert to seconds
        event.seconds = event.timestamp * 1000;
        // get max
        if (event.seconds > max){
          max = event.seconds;
        }
        // make valid events list
        if (event.seconds > now){
          future_events.push(event);
        }
      }
      if (future_events.length > 1) {
        future_events.sort(function(x,y) {
          return y.timestamp < x.timestamp;
        });
      }
      _.each(future_events, function(event){
        event.days_remaining = Math.floor((event.seconds - now) / (1000*60*60*24));
        // figure out the amount and offset from the right 100px and from the left 25px
        var amt = ((event.seconds - now) / (max - now + 1)) * 0.8;
        event.position = amt * 100;
      });
      res.render('index.jade', {events: future_events, project: project});
  });
  app.get(
    urls.ABOUT,
    function(req, res) {
      res.render("about.jade", {name: "About"});
    });

  app.get(
    urls.META_INDEX,
    function(req, res) {
      var context = {
        name: 'Dashboards',
        projects: _.keys(devops),
        external_projects: settings.external_projects,
        links: settings.metadashboard_uris
      };
      res.render('meta_index.jade', context);
    });

  app.get(
    urls.SERVICE_HEALTH,
    function(req, res){
      var context = {};
      context.hosts =  status_api.get_service_stats(req.params.project);
      context.HEALTH_ENUM = utils.HEALTH_ENUM;
      context.SHOW_ALL = 1030300;
      context.VALID_HEALTH = utils.VALID_HEALTH;
      context.HEALTH_STRING_OK = utils.HEALTH_STRING_OK;
      context.HEALTH_STRING_PROBLEM = utils.HEALTH_STRING_PROBLEM;
      context.HEALTH_STRING_ERROR = utils.HEALTH_STRING_ERROR;
      context.HEALTH_STRING_UNKNOWN = utils.HEALTH_STRING_UNKNOWN;
      context.HEALTH_ERROR = utils.HEALTH_ERROR;
      res.render('service_health.jade', context);
    });

  app.get(
    urls.HIGH_SCORES,
    function(req, res){
      res.render('highscores.jade');
  });
};
