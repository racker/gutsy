var fs = require('fs');
var path = require('path');
var optimist = require('optimist');

var app = require('./web/app');
var crawler = require('./crawler/app');
var utils = require('./utils');

exports.run = function() {
  var argv, devops;

  optimist = optimist.usage('Usage: $0 -p [port] -d [devops.json] [-c] [-h]');
  optimist = optimist['default']('p', 3000);
  optimist = optimist['default']('d', path.join(__dirname, '..', 'fixtures', 'devops.json'));
  optimist = optimist['default']('c', false);
  optimist = optimist['default']('h', false);
  optimist = optimist.alias('c', 'crawler');
  optimist = optimist.describe('c', 'Run the crawler to update devops.json');
  optimist = optimist.alias('h', 'help');
  optimist = optimist.describe('h', 'Print usage help');
  argv = optimist.argv;

  if (argv.h) {
    optimist.showHelp(console.log);
  } else if (argv.c) {
    crawler.run(argv);
  } else {
    devops = utils.load_devops(argv.d);

    app.run(argv, devops);
  }
};
