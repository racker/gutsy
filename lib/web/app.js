var express = require('express');
var path = require('path');
var fs = require('fs');
var async = require('async');
var _ = require('underscore');
var urls = require('./urls');
var utils = require('../utils');
var settings = require('../../settings');
var middleware = require('./middleware');
var TEMPLATE_DIR = path.join(__dirname, 'views');
// var filters = require('./filters/time');

exports.run = function(port, devops_directory, host) {
  var app = express.createServer();

  app.set('views', TEMPLATE_DIR);
  app.set('view engine', 'jade');
  app.set('view options', {layout: false});

  /* setup middleware */
  app.use(middleware.logger());
  app.use(middleware.devops_directory_setter(devops_directory));
  // app.use(middleware.injector());
  // NOTE: this won't work because req.params is undefined  :-/
  app.use(middleware.injector.injector_middleware);

  app.use('/static', express.static(path.join(__dirname, '..', '..', 'extern')));
  app.use('/static', express.static(path.join(__dirname, '..', '..', 'static')));
  app.use(middleware.cache_me(5*60));

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

  app.listen(port, host);
};
