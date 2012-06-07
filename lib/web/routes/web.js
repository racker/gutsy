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
var querystring = require('querystring');
var url = require('url');

var express = require('express');
var async = require('async');
var _ = require('underscore');

var db = require('../db');
var urls = require('../urls');
var middleware = require('../middleware');
var settings = require('../../settings');
var utils = require('../../utils').common;
var log = require('../../log');
var ReleaseNotesWorker = require('../release_notes/worker');
var crawler = require('../../crawler/app');
var init = require('../init');
var events = require("../events");
var RELATED_APIS = events.RELATED_APIS;
var MULTIPLIERS = events.MULTIPLIERS;

function get_project(req) {
  return PROJECTS[req.params.project];
}

function get_related_api(req, api) {
  return PROJECTS[req.params.project].devops.related_apis[api];
}

module.exports.install = function(web_app){
  web_app.use(express.errorHandler({ showStack: true, dumpExceptions: true }));

  var default_middleware = [middleware.project_checker, middleware.injector.inject];

  var add_route = function(method, urls, middleware, func){
    if (func === undefined){
      func = middleware;
      middleware = undefined;
    }
    middleware = middleware !== undefined ? middleware.concat(default_middleware) : default_middleware;
    web_app[method](urls, middleware, func);
  };

  add_route('get',
    urls.DEFECTS,
    function(req, res) {
      res.render('defects.jade');
  });

  add_route('get',
    urls.DEVHEALTH,
    function(req, res) {
      res.render('devhealth.jade');
    });

  add_route('get',
    urls.RELEASE_NOTES,
    function(req, res) {
      var context = {notes: null, errors: null};
      var start = req.query.start;
      var end = req.query.end;
      var worker;

      if(!start && !end){
        context.start = new Date(new Date().valueOf() - 7 * 24 * 60 *60 * 1000).toISOString();
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

      worker = new ReleaseNotesWorker(PROJECTS[req.params.project].pollers, start, end);
      worker.work(function(err, results){
        var v1_config = get_related_api(req, 'version_one');
        var dread_config = get_related_api(req, 'dreadnot');
        var notes;
        var i;

        if (err){
          context.errors = err;
        }
        _.defaults(context, results);
        context.v1_host = v1_config ? v1_config.host : null;
        context.dread_host = dread_config ? dread_config.host : null;
        if (req.query.format && req.query.format.toLowerCase() === 'json'){
          notes = [];
          for (i=0; i<context.notes.length; i++){
            notes.push(context.notes[i].toJSON(v1_config));
          }
          return res.json(notes);
        }
        return res.render('release_notes.jade', context);
      });
  });

  add_route('get',
    urls.INDEX,
    function(req, res) {
      var project = get_project(req);
      var events = project.devops.events;
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
      res.render('index.jade', {events: future_events, devops: project.devops});
  });
  add_route('get',
    urls.ABOUT,
    function(req, res) {
      res.render("about.jade", {name: "About"});
    });

  add_route('get',
    urls.META_INDEX,
    function(req, res) {
      var context = {
        name: 'Dashboards',
        projects: PROJECTS,
        external_projects: settings.external_projects,
        links: settings.metadashboard_uris
      };

      res.render('meta_index.jade', context);
    });

  add_route('post',
    urls.META_INDEX,
    [express.bodyParser()],
    function(req, res) {
      var data = req.body;
      var actions = [crawler.run, init];

      var respond = function(err, results){
        if (err) {
          log.error(err);
        }
        return res.redirect(urls.META_INDEX);
      };

      if (data.id) {
        // lame workaround because forms can only POST and GET
        if (data.action === "Delete") {
          return init.delete_project(data.id, respond);
        }
        return init.update_project(data.id, data.url, data.devops_json, data.creds, respond);
      }
      return init.add_project(data.name, data.url, data.devops_json, data.creds, respond);

    });

  add_route('post',
    urls.CRAWL,
    function (req, res) {
      var actions = [crawler.run, app.init];
      async.series(actions, function (err, results) {
        return res.redirect(urls.META_INDEX);
      });
    });

  add_route('get',
    urls.SERVICE_HEALTH,
    function(req, res){
      var context = {};
      context.health = {
        healthy: "health-healthy",
        unhealthy: "health-unhealthy"
      };
      res.render('service_health.jade', context);
    });

  add_route('get',
    urls.HIGH_SCORES,
    function(req, res){
      var correlated_data = {};
      var project = req.params.project;
      var start_date = req.query.start;
      var end_date = req.query.end;
      var all = req.query.all;
      var temp_date = new Date();
      var query = req.query;
      var query_string = "";
      var should_add_start_date = !(start_date || all);

      if (all && _.keys(query).length > 1) {
        return res.redirect("https://" + req.headers.host + req.path + "?all=true");
      }

      if (should_add_start_date) {
        start_date = new Date(temp_date.getFullYear(), temp_date.getMonth());
        query.start = start_date.toISOString();
        query_string = querystring.stringify(query);
        return res.redirect("https://" + req.headers.host + req.path + "?" + query_string);
      }

      db.get_highscores(project, start_date, end_date, function(errors, results){

        res.render('highscores.jade', {
          data: results,
          errors: errors,
          start: req.query.start,
          end: req.query.end,
          encodeURI: encodeURI,
          query_string: querystring.stringify(query)
        });
      });
    }
  );

  add_route('get',
    urls.HIGH_SCORES_BREAKDOWN,
    function (req, res) {
      var project = req.params.project;
      var username = req.params.username;
      var start_date = req.query.start;
      var end_date = req.query.end;

      var options = {
        breakdown: function(cb){
          db.get_highscore_breakdown(project, start_date, end_date, username, cb);
        },
        aliases: function(cb){
          db.get_aliases(username, cb);
        },
        api_user_dict: function (cb) {
          db.get_db().all('SELECT related_api FROM events WHERE user=? GROUP BY user;', [username], cb);
        },
        alias_display: function (cb) {
          db.get_db().get('SELECT * FROM alias_display WHERE display_name=?;', [username], cb);
        }
      };
      async.parallel(options, function(err, results){
        var aliases = {};

        _.each(results.api_user_dict, function(related_api) {
          aliases[related_api.related_api] = username;
        });

        _.each(results.aliases, function(alias){
          aliases[alias.related_api] = alias.alias;
        });

        var context = {
          display_name: username,
          alias_display_id: results.alias_display ? results.alias_display.id : null,
          events: results.breakdown,
          aliases: aliases,
          start: start_date,
          end: end_date,
          MULTIPLIERS: MULTIPLIERS,
          describe: events.describe,
          supported_apis: RELATED_APIS
        };
        res.render('highscores_breakdown.jade', context);
      });
    });

  add_route('post',
    urls.ADD_TITLE,
    [express.bodyParser()],
    function(req, res){
      var data = req.body;
      var db_queries = [];

      if (!data || !data.display_name || data.display_name.length <= 0){
        return res.redirect("back");
      }

      _.each(RELATED_APIS, function (related_api) {
        db_queries.push(function(cb) {
          if (data[related_api] && data[related_api].length > 0) {
            db.add_alias(data[related_api], data.display_name, related_api, data.alias_display_id, cb);
          }
          else {
            db.delete_alias(related_api, data.alias_display_id, cb);
          }
        });
      });

      async.parallel(db_queries, function(err, results) {
        var path;
        var parsed_url;
        var referer = req.header('referer');

        if (err) {
          log.error(err);
        }

        parsed_url = url.parse(referer);

        path = parsed_url.pathname.slice(0, parsed_url.pathname.lastIndexOf('/'));
        path += '/' + encodeURI(data.display_name);

        return res.redirect("https://" + parsed_url.host + path + "?" + parsed_url.query);
      });
  });

  add_route('post',
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
          log.error(err);
          return res.send('oh noes', 400);
        }
        res.json('OK');
      });
    });
};
