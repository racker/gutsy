var urls = require('./urls');
var middleware = require('./middleware');
var settings = require('../settings');
var utils = require('../utils');
var express = require('express');
var async = require('async');
var fs = require('fs');
var _ = require('underscore');

module.exports.install = function(app, secure_app, status_api, devops){
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
    urls.INDEX,
    function(req, res) {
      var project_name = req.params.project;
      var project = devops[project_name];
      var events = project.events;

      var max = 0;

      var now = (new Date()).getTime();
      var future_events = [];
      for (var i=0; i<events.length; i++){
        var event = events[i];
        if (_.isNull(event.timestamp)){
          continue;
        }
        // convert to seconds
        event.timestamp *= 1000;
        // get max
        if (event.timestamp > max){
          max = event.timestamp;
        }
        // make valid events list
        if (event.timestamp > now){
          future_events.push(event);
        }
      }
      if (future_events.length > 1) {
        future_events.sort(function(x,y) {
          return y.timestamp < x.timestamp;
        });
      }
      _.each(future_events, function(event){
        event.days_remaining = Math.floor((event.timestamp - now) / (1000*60*60*24));
        // figure out the amount and offset from the right 100px and from the left 25px
        var amt = ((event.timestamp - now) / (max - now + 1)) * 0.8;
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
  if (!secure_app){
    return;
  }
  secure_app.post(
    urls.API,
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
      try{
        status_api.handle_push(project, data);
      } catch(e){
        msg = e.message;
        if (settings.debug === true){
          msg += '\n' + e.stack;
        }
        return res.send(msg, 400);
      }
      res.json("OK");
    });
};
