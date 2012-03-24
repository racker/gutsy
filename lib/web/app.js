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
  // app.use(middleware.load_devops);
  app.use('/static', express.static(path.join(__dirname, '..', '..', 'extern')));
  app.use('/static', express.static(path.join(__dirname, '..', '..', 'static')));

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
              // This takes too long.
              // @TODO: grab just the total from a page of 1 item
              // @TODO: sit a cache between all these requests
              //middleware.version_one(null, null, cb);
              cb();
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
