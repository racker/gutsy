var express = require('express');
var path = require('path');

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

  app.get('/', middleware.contexter(devops), function(req, res) {
    res.render('index.jade', devops);
  });

  app.listen(argv.p);
}
