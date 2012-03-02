var express = require('express');
var path = require('path');
var fs = require('fs');
var async = require('async');
var utils = require('../utils');
var urls = require('./urls');
var contexter = require('./contexter');
var middleware = require('./middleware');
var TEMPLATE_DIR = path.join(__dirname, 'views');

exports.run = function(port, devops_directory) {
  var app = express.createServer();

  app.set('views', TEMPLATE_DIR);
  app.set('view engine', 'jade');
  app.set('view options', {layout: false});

  /* setup middleware */
  app.use(middleware.logger());
  app.use('/static', express.static(path.join(__dirname, '..', '..', 'extern')));
  app.use('/static', express.static(path.join(__dirname, '..', '..', 'static')));

  app.get(
      '/favicon.ico',
      function(req, res) {
        res.send("favicon");
      });

  app.get(
      urls.DEFECTS,
      function(req, res) {
        var devops, devops_path;
        var devops_path = path.join(__dirname, '..', '..', devops_directory, req.params.project);

        devops = utils.load_devops(devops_path);
        contexter(devops, req.params.project);
        middleware.versionone(devops)(null, null, function() {
          res.render('defects.jade', devops);
        });
      });

  app.get(
      urls.DEVHEALTH,
      function(req, res) {
        var devops, devops_path;
        var devops_path = path.join(__dirname, '..', '..', devops_directory, req.params.project);

        devops = utils.load_devops(devops_path);
        contexter(devops, req.params.project);
        middleware.github(devops)(null, null, function() {
          res.render('devhealth.jade', devops);
        });
      });

  app.get(
      urls.INDEX,
      function(req, res) {
        var devops, devops_path;
        var devops_path = path.join(__dirname, '..', '..', devops_directory, req.params.project);
        devops = utils.load_devops(devops_path);
        contexter(devops, req.params.project);
        async.parallel([
            function(cb) {
              middleware.pagerduty(devops)(null, null, cb);
            }, function(cb) {
              middleware.versionone(devops)(null, null, cb);
            }, function(cb) {
              middleware.github(devops)(null, null, cb);
            }
          ], function() {
          res.render('index.jade', devops);
        });
      });

  app.get(
      urls.META_INDEX,
      function(req, res) {
        fs.readdir(devops_directory, function(err, projects) {
          console.log("PROJECTS", projects);
          var context, i;
          context = {
              name: 'Meta Dashboard',
              projects: projects,
              navbar: {}
          };
          for (i = 0; i < projects.length; i++) {
            context.navbar[projects[i]] = '/' + projects[i];
          }
          res.render('meta_index.jade', context);
        });
      });

  app.listen(port);
};
