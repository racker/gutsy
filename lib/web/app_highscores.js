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
var express = require('express');

var _ = require('underscore');

var routes = require('./routes_highscores');
var settings = require('../settings');
var middleware = require('./middleware');
var github = require('./github');
var version_one = require('./version_one');
var db = require('./db');

var devops = require('./devops').load();

exports.run = function(port, host) {
  var app = express.createServer();

  // app.set('views', TEMPLATE_DIR);
  // app.set('view engine', 'jade');
  // app.set('view options', {layout: false});
  app.use(middleware.logger());

  if (settings.testing === true){
    app.enable('testing');
  }
  db.create_tables(function(){
    routes.install(app, devops);
    app.listen(port, host);

    github_hooks.install(devops);
    version_one.install(devops);
  });
};
