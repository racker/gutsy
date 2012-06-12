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

var middleware = require('./middleware');
var log = require('../log');
var routes = require('./routes');
var utils = require('../utils').common;
var settings = require('../settings');
var crawler = require('../crawler/app');
var init = require('./init');

exports.run = function(argv) {
  var certificate, privateKey;
  var host = argv.l;
  var port = settings.github_hook_listen_port || 3000;
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

  init.install(function (err, results) {
    if (err) {
      utils.die("Init failed:", err);
    }

    routes.web.install(web_app);
    web_app.listen(443, host);

    routes.hooks.install(hooks_server);
    hooks_server.listen(port, host);

    if (settings.pokemon === true) {
      // GOTTA CATCH 'EM ALL!
      process.on('uncaughtException', function(err) {
        log.error(err);
      });
    }

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
      init.install();
    });
  });
};
