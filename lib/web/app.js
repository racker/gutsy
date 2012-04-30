
var path = require('path');
var fs = require('fs');
var async = require('async');
var _ = require('underscore');

var express = require('express');

var load_devops = require('./load_devops');
var middleware = require('./middleware');
var routes = require('./routes');
var utils = require('../utils');
var settings = require('../settings');
var pollers = require('./pollers');

var TEMPLATE_DIR = path.join(__dirname, 'views');
var status_api = new utils.api_cache();

exports.run = function(port, devops_directory, host) {
  var app, secure_app, certificate, privateKey;
  var base_path = path.join(__dirname, '../..');
  var apps = [];
  var devops;

  if(settings.private_key && settings.cert){
    try{
      privateKey = fs.readFileSync(path.join(base_path, settings.private_key)).toString();
      certificate = fs.readFileSync(path.join(settings.cert)).toString();
    }catch(e){
      console.warn('Could not find the private key and/or cert; not starting the API.');
    }
    if (settings.valid_users.length <= 0){
      console.warn('You must define valid_users in settings; not starting the API.');
    }else if(privateKey && certificate){
      secure_app = express.createServer({key: privateKey, cert: certificate});
      apps.push(secure_app);
    }
  }else{
    console.warn('No key/cert defined in settings; not starting the API.');
  }

  app = express.createServer();
  apps.push(app);
  _.each(apps, function(_app){
    _app.set('views', TEMPLATE_DIR);
    _app.set('view engine', 'jade');
    _app.set('view options', {layout: false});
    _app.use(middleware.logger());
    if (settings.testing === true){
      _app.enable('testing');
    }
  });

  app.use('/static', express.static(path.join(__dirname, '..', '..', 'extern')));
  app.use('/static', express.static(path.join(__dirname, '..', '..', 'static')));
  /* setup middleware */
  //app.use(middleware.cache_me(5*60));
  //app.use(middleware.devops_directory_setter(devops_directory));

  // load devops
  devops = load_devops(devops_directory);

  pollers.install(devops, function(polling_data){
    app.use(middleware.injector.inject(polling_data, devops));
    routes.install(app, secure_app, status_api, devops);
    app.listen(port, host);
    if (secure_app){
      secure_app.listen(443, '0.0.0.0');
    }
    if (settings.testing !== true){
      // set up the flusher
      setInterval(_.bind(status_api.flush_data, status_api), settings.flush_stats_interval);
    }
  });
};
