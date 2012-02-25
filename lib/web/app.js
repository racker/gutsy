var express = require('express');
var path = require('path');
var getPagerDutyRotation = require('../utils/pagerduty').getPagerDutyRotation;

var middleware = require('./middleware');

var TEMPLATE_DIR = path.join(__dirname, 'views');

exports.run = function(argv, devops) {
  var app = express.createServer();

  app.set('views', TEMPLATE_DIR);
  app.set('view engine', 'jade');
  app.set('view options', {layout: false});

  /* setup middleware */
  app.use(middleware.logger());
  app.use('/static', express.static(path.join(__dirname, '..', '..', 'extern')));
  app.use('/static', express.static(path.join(__dirname, '..', '..', 'static')));

  app.get('/', function(req, res) {
    function onPagerDutyResponse(err, data) {
      var context = {devops:devops, error:null};
      if (err) {
        context.error = err;
        console.error("Pagerduty Failed");
        res.render('index.jade', context);
        return;
      }
      context.data = data;
      res.render('index.jade', context);
    }
    getPagerDutyRotation(onPagerDutyResponse);
  });
  app.listen(argv.p);
};
