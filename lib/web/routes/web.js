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

var db = require('../db');
var urls = require('../urls');
var middleware = require('../middleware');
var settings = require('../../settings');
var utils = require('../../utils');
var Release_Notes_Worker = require('../release_notes_worker');
var crawler = require('../../crawler/app');

var RELATED_APIS = require('../events').RELATED_APIS;

function get_devops(req, devops, api){
  var _devops = devops[req.params.project];
  if (!api){
    return _devops;
  }
  return _devops.related_apis[api];
}

module.exports.install = function(app, devops, polling_data, idjson){
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
      var context = {notes: null, errors: null};
      var start = req.query.start;
      var end = req.query.end;
      var worker;

      if(!start && !end){
        context.start = new Date(new Date().valueOf() - 31 * 24 * 60 *60 * 1000).toISOString();
        context.end = new Date().toISOString();
        return res.render('release_notes.jade', context);
      }
      context.start = start;
      context.end = end;
      if ((!start && end) || (!end && start)){
        context.errors = "Supply start and end!";
        return res.render('release_notes.jade', context);
      }

      try{
        start = new Date(start);
        end = new Date(end);
      }catch(e){
        context.errors = "I could not parse a date!" + e;
        return res.render('release_notes.jade', context);
      }

      if (start.toString() === 'Invalid Date' || end.toString() === 'Invalid Date'){
        context.errors = "I could not parse a date!";
        return res.render('release_notes.jade', context);
      }

      // we now know that the dates are valid
      context.start = start.toISOString();
      context.end = end.toISOString();

      worker = new Release_Notes_Worker(polling_data[req.params.project], start, end);
      worker.work(function(err, results){
        var v1_config = get_devops(req, devops, 'version_one');
        var dread_config = get_devops(req, devops, 'dreadnot');

        if (err){
          context.errors = err;
        }
        _.defaults(context, results);
        context.v1_host = v1_config ? v1_config.host : null;
        context.dread_host = dread_config ? dread_config.host : null;
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
        db.get_service_stats(req.params.project, function(err, results){
          context.hosts =  results;
          context.SHOW_ALL = 1030300;
          res.render('service_health.jade', context);
        });
      });

  app.get(
    urls.HIGH_SCORES,
    function(req, res){
      var correlated_data = {};
      var project = req.params.project;
      var start_date = req.params.start;
      var end_date = req.params.end;

      db.get_highscores(project, start_date, end_date, function(errors, results){
        var place;
        var row;
        var i;
        var in_version_one;
        var github_name;

        while (results.length >= 1){
          row = results.pop();

          if (row.related_api === RELATED_APIS.github){
            correlated_data[row.username] = row;
            continue;
          }

          in_version_one = _.has(idjson, row.username);
          if (!in_version_one){
            correlated_data[row.username] = row;
            continue;
          }

          github_name = idjson[row.username];
          if (_.has(correlated_data, github_name)){
            correlated_data[github_name].score += row.score;
            continue;
          }

          row.username = github_name;
          correlated_data[row.username] = row;
        }
        correlated_data = _.values(correlated_data).sort(function(a, b){
          return b.score - a.score;
        });

        for (i = 0; i < correlated_data.length; i++){
          switch (i+1){
            case 1:
              place = '1st';
              break;
            case 2:
              place = '2nd';
              break;
            case 3:
              place = '3rd';
              break;
            default:
              place = i + 1 + 'th';
              break;
          }
          correlated_data[i].place = place;
        }

        res.render('highscores.jade', {data: correlated_data, errors: errors});
      });
    }
  );

  app.post(
    urls.RUN_CRAWLER,
    function (req, res) {
      crawler.run();
      res.send('', 204);
    }
  );

  app.post(
    urls.STATS_API,
    [middleware.basic_auth,
     express.bodyParser()],
    function(req, res) {
      var project = req.params.project;
      var data = req.body;
      var msg;
      //TODO: use swiz for this
      if (!data || _.isEmpty(data)){
        return res.send('You must give me data.  Did you specify the mime type?', 400);
      }
      //TODO: do we need to parse for safety?
      db.add_service_stat(project, req.socket.remoteAddress, data, function(err, results){
        if (err){
          return res.send('oh noes', 400);
        }
        res.json('OK');
      });
    });
};
