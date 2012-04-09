var urls = require('./urls');
var middleware = require('./middleware');
var settings = require('../settings');
var utils = require('../utils');
var express = require('express');
var async = require('async');
var fs = require('fs');
var _ = require('underscore');

module.exports.install = function(app, secure_app, api_cache, devops_directory){
  app.get(
    '/favicon.ico',
    function(req, res) {
      res.send("favicon");
    });
  app.get(
    urls.DEFECTS,
    [middleware.load_devops,
     middleware.navbar,
     middleware.version_one],
    function(req, res) {
      res.render('defects.jade', req.devops);
    });
  app.get(
    urls.DEVHEALTH,
    [middleware.load_devops,
     middleware.navbar,
     middleware.github],
    function(req, res) {
      res.render('devhealth.jade', req.devops);
    });

  app.get(
  urls.INDEX,
  [middleware.load_devops,
   middleware.navbar],
  function(req, res) {
    async.parallel([
        function(cb) {
          middleware.pager_duty(req, res, cb);
        }, function(cb) {
          middleware.version_one(req, res, cb);
        }, function(cb) {
          middleware.github(req, res, cb);
        }, function(cb) {
          middleware.new_relic(req, res, cb);
        }, function(cb){
          middleware.dreadnot(req, res, cb);
        }
      ],
      function(err) {
        if (err) {
          req.devops.errors.push(err);
        }

        var events = req.devops.events;
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
        req.devops.events = future_events;
        res.render('index.jade', req.devops);
      }
    );
  });

  app.get(
    urls.ABOUT,
    function(req, res) {
      fs.readdir(devops_directory, function(err, projects) {
        var context = {
          name: 'About',
          navbar: {},
          url: req.url
        };
        res.render("about.jade", context);
      });
    });

  app.get(
    urls.META_INDEX,
    function(req, res) {
      fs.readdir(devops_directory, function(err, projects) {
        var context = {
          name: 'Dashboards',
          projects: projects,
          external_projects: settings.external_projects,
          links: settings.metadashboard_uris,
          navbar: {},
          url: req.url
        };
        res.render('meta_index.jade', context);
      });
    });
  app.get(
    urls.SERVICE_HEALTH,
    [middleware.load_devops,
     middleware.navbar],
    function(req, res){
      var context = req.devops;
      context.hosts =  api_cache.get_service_stats(req.params.project);
      console.log(context.hosts+'\n\n\n\n');
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
        api_cache.handle_push(project, data);
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
