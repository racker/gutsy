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

var path = require('path');
var fs = require('fs');
var async = require('async');
var _ = require('underscore');

var express = require('express');

var devops = require('./devops');
var middleware = require('./middleware');
var log = require('../log');
var routes = require('./routes');
var utils = require('../utils');
var settings = require('../settings');
var pollers = require('./pollers');
var hooks = require('./hooks');
var db = require('./db');
var crawler = require('../crawler/app');

var project_installer_factory = function(project){
  return function(cb){
    log.log("Initializing...", project.name);
    async.waterfall([
      // push the project onto the stack
      function(cb){
        cb(null, project);
      },
      devops.load,
      pollers.install,
      hooks.install],
      function(err, project){
        if (err){
          log.error(err);
        }
        if (project !== undefined){
          var existing_project = PROJECTS[project.name];
          if (existing_project && existing_project.interval_id){
            clearTimeout(existing_project.interval_id);
          }
          PROJECTS[project.name] = project;
        }
      return cb(err, project);
      }
    );
  };
};

var install_projects = function (cb) {
  var project_installers = [];
  var q = async.queue(function(installer, cb){
    installer(cb);
  }, 10);
  q.drain = function(){cb();};
  db.get_projects(undefined, function(err, results){
    if (results.length <=0 ){
      return cb();
    }
    _.each(results, function(project){
      var installer = project_installer_factory(project);
      q.push(installer);
    });
  });
};

exports.init = install_projects;

exports.run = function(argv) {
  var certificate, privateKey;
  var devops;
  var host = argv.l;
  var port = argv.p;
  var hooks_server;
  var redirect_app;
  var web_app;
  var idjson;
  var startup_actions;

  if(!settings.private_key || !settings.cert){
    utils.die('No key/cert defined in settings; you can mv lib/keys.example to lib/keys.');
    return;
  }

  if (!settings.external_ipv4) {
    utils.die('external_ipv4 is not defined in settings.');
  }

  try{
    privateKey = fs.readFileSync(path.join(settings.private_key)).toString();
    certificate = fs.readFileSync(path.join(settings.cert)).toString();
  }catch(e){
    utils.die('Could not find the private key and/or cert; not starting.');
  }
  if (settings.valid_users.length <= 0){
    utils.die('You must define valid_users in settings; not starting.');
  }

  redirect_app = express.createServer();
  redirect_app.all("*", function (req, res, next) {
    return res.redirect("https://" + req.headers.host + req.url, 301);
  });
  redirect_app.listen(80, host);

  web_app = express.createServer({key: privateKey, cert: certificate});

  web_app.set('views', path.join(__dirname, 'views'));
  web_app.set('view engine', 'jade');
  web_app.set('view options', {layout: false});
  web_app.use(express.logger());
  web_app.use(middleware.vpn_only);
  web_app.use('/static', express['static'](path.join(__dirname, '..', '..', 'static')));
  web_app.use('/static', express['static'](path.join(__dirname, '..', '..', 'extern')));
  if (settings.testing === true){
    web_app.enable('testing');
  }

  hooks_server = express.createServer();
  hooks_server.use(express.logger());

  async.series([
    _.bind(db.create_tables, db),
    install_projects], function (err, results) {

    if (err) {
      utils.die("Init failed:", err);
    }

    routes.web.install(web_app);
    web_app.listen(443, host);

    routes.hooks.install(hooks_server);
    hooks_server.listen(port, host);

    process.on('uncaughtException', function(err) {
      log.error(err);
    });

    process.on('SIGHUP', function() {
      log.log('Got SIGHUP');
      // Node.js's require isn't actually a global but rather local to each module.
      var new_settings;
      var old_settings = settings;
      // We want to read the new settings, so delete settings from the require cache
      delete require.cache[path.join(__dirname, "../", "settings.js")];
      new_settings = require('../settings');
      // now modify the settings object so that all other modules see the new settings
      _.each(old_settings, function (value, key) {
        delete old_settings[key];
      });
      _.each(new_settings, function (value, key) {
        old_settings[key] = value;
      });
      settings = old_settings;

      crawler.run(function (err, results) {
        if (err) {
          log.error(err);
        }
        install_projects();
      });
    });
  });
};
