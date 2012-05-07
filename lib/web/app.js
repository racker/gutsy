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
var routes_highscores = require('./routes_highscores');
var settings = require('../settings');
var hooks = require('./hooks');
var db = require('./db');


var TEMPLATE_DIR = path.join(__dirname, 'views');
var status_api = new utils.api_cache();

exports.run = function(argv) {
  var app, certificate, privateKey;
  var devops;
  var devops_directory = argv.d;
  var host = argv.l;
  var port = argv.p;
  var highscores_app;

  if(!settings.private_key || !settings.cert){
    utils.die('No key/cert defined in settings; not starting the API.');
    return;
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

  app = express.createServer({key: privateKey, cert: certificate});

  app.set('views', TEMPLATE_DIR);
  app.set('view engine', 'jade');
  app.set('view options', {layout: false});
  app.use(middleware.logger());
  app.use(middleware.vpn_only);
  app.use('/static', express.static(path.join(__dirname, '..', '..', 'extern')));
  app.use('/static', express.static(path.join(__dirname, '..', '..', 'static')));
  if (settings.testing === true){
    app.enable('testing');
  }

  devops = load_fixtures(devops_directory);

  highscores_app = express.createServer();
  highscores_app.use(middleware.logger());

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

      app.use(middleware.injector.inject(polling_data, devops));
      routes.install(app, status_api, devops, polling_data);
      app.listen(443, host);

      routes_highscores.install(highscores_app, devops);
      highscores_app.listen(port, host);
    });
  });
};
