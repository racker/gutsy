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

var load_fixtures = require('./load_fixtures');
var load_idjson = require('./load_idjson');
var middleware = require('./middleware');
var routes = require('./routes');
var utils = require('../utils');
var settings = require('../settings');
var pollers = require('./pollers');
var settings = require('../settings');
var hooks = require('./hooks');
var db = require('./db');


var TEMPLATE_DIR = path.join(__dirname, 'views');

exports.run = function(argv) {
  var certificate, privateKey;
  var devops;
  var devops_directory = argv.d;
  var host = argv.l;
  var port = argv.p;
  var hooks_server;
  var redirect_app;
  var web_app;
  var idjson;

  if(!settings.private_key || !settings.cert){
    utils.die('No key/cert defined in settings; not starting the API.');
    return;
  }

  if (!settings.external_ipv4) {
    utils.die('external_ipv4 is not defined in settings.');
  }

  try{
    privateKey = fs.readFileSync(path.join(settings.private_key)).toString();
    certificate = fs.readFileSync(path.join(settings.cert)).toString();
  }catch(e){
    utils.die('Could not find the private key and/or cert; not starting the API.');
  }
  if (settings.valid_users.length <= 0){
    utils.die('You must define valid_users in settings; not starting the API.');
  }

  redirect_app = express.createServer();
  redirect_app.all("*", function (req, res, next) {
    res.header('location', "https://" + req.headers.host + req.url);
    res.send("", 301);
  });
  redirect_app.listen(80, host);

  web_app = express.createServer({key: privateKey, cert: certificate});

  web_app.set('views', TEMPLATE_DIR);
  web_app.set('view engine', 'jade');
  web_app.set('view options', {layout: false});
  web_app.use(middleware.logger());
  web_app.use(middleware.vpn_only);
  web_app.use('/static', express.static(path.join(__dirname, '..', '..', 'extern')));
  web_app.use('/static', express.static(path.join(__dirname, '..', '..', 'static')));
  if (settings.testing === true){
    web_app.enable('testing');
  }

  devops = load_fixtures(devops_directory);
  idjson = load_idjson.load();

  hooks_server = express.createServer();
  hooks_server.use(middleware.logger());

  db.create_tables(function (){
    async.parallel({
      github_data: function (cb) {
        hooks.install(devops, cb);
      },
      polling_data: function (cb) {
        pollers.install(devops, cb);
      }
    },
    function (err, results) {
      var polling_data;
      if (err) {
        utils.die(err);
      }
      polling_data = results.polling_data;

      web_app.use(middleware.injector.inject(polling_data, devops));
      routes.web.install(web_app, devops, polling_data, idjson);
      web_app.listen(443, host);

      routes.hooks.install(hooks_server, devops);
      hooks_server.listen(port, host);
    });
  });
};
