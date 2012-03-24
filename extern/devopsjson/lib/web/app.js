var express = require('express');
var path = require('path');
var JSV = require('JSV').JSV;
var schema = require('./schema').schema;
var middleware = require('./middleware');

var TEMPLATE_DIR = path.join(__dirname, 'views');

// http://tools.ietf.org/html/draft-zyp-json-schema-03
var jsv_env = JSV.createEnvironment('json-schema-draft-03');

exports.run = function(argv) {
  var app = express.createServer();

  app.set('views', TEMPLATE_DIR);
  app.set('view engine', 'jade');
  app.set('view options', {layout: false});

  /* setup middleware */
  app.use(express.bodyParser());
  app.use(middleware.logger());
  app.use('/static', express.static(path.join(__dirname, '..', '..', 'extern')));
  app.use('/static', express.static(path.join(__dirname, '..', '..', 'static')));

  app.get('/', function(req, res) {
    res.render('index.jade', {
        'json_text': null,
        'report': null});
  });

  app.post('/', function(req, res) {
    var json_text = req.body.json_text;
    var report = {'errors': [], 'validated': []};
    try {
      var parse_json = JSON.parse(json_text);
      report = jsv_env.validate(parse_json, schema);
    } catch (err) {
      report.errors = [{'reason': err.message}];
    }
    res.render('index.jade', {
        'json_text': json_text,
        'report': report});
  });

  app.get('/schema', function(req, res) {
    res.render('schema.jade', {
        'schema': JSON.stringify(schema, undefined, 2)});
  });

  app.listen(argv.p);
};
