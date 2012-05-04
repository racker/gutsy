var child_process = require('child_process');
var fs = require('fs');
var path = require('path');
var optimist = require('optimist');

var app = require('./web/app');
var settings = require('./settings');
var crawler = require('./crawler/app');
var utils = require('./utils');
var _ = require('underscore');

exports.run = function() {
  var argv;
  var child_args;
  var log_file;
  var pid_file_name;
  var pid_file;

  optimist = optimist.usage('Usage: $0 [-l 0.0.0.0] -p [port] -d [devops.json] [-D] [-c] [-h]');
  optimist = optimist['default']('l', '0.0.0.0');
  optimist = optimist.describe('l', 'Listening address');
  optimist = optimist['default']('p', 3000);
  optimist = optimist['default']('d', settings.saved_crawls_path);
  optimist = optimist['default']('c', false);
  optimist = optimist['default']('h', false);
  optimist = optimist['default']('D', false);
  optimist = optimist.alias('c', 'crawler');
  optimist = optimist.describe('c', 'Run the crawler to update devops.json');
  optimist = optimist.describe('D', 'Detach and run as a service');
  optimist = optimist.describe('log-file', 'File to log output to');
  optimist = optimist.describe('pid-file', 'File to log process id to');
  optimist = optimist.alias('h', 'help');
  optimist = optimist.describe('h', 'Print usage help');
  argv = optimist.argv;

  if (argv.h) {
    optimist.showHelp(console.log);
    process.exit();
  }

  if (argv.D) {
    child_args = process.argv.slice(2);
    child_args = child_args.filter(function (element) {
      return (element != '-D');
    });

    child_process.fork(__dirname + '/entry.js', child_args);
    process.exit();
  }

  if (argv.c) {
    crawler.run(argv);
    process.exit();
  }

  if (argv['log-file']) {
    log_file = fs.createWriteStream(argv['log-file'], { flags: 'a' });
    // process.stderr.pipe(log_file) doesn't work in node 0.6 and later
    process.__defineGetter__('stdout', function() { return log_file; });
    process.__defineGetter__('stderr', function() { return log_file; });
  }

  if (argv['pid-file']) {
    pid_file_name = argv['pid-file'];
    try {
      fs.readFileSync(pid_file_name);
      console.log('Process id file', pid_file_name, "already exists! Exiting.");
      process.exit(1);
    }
    catch (e) {
      pid_file = fs.writeFileSync(pid_file_name, process.pid);
      process.on('exit', function () {
        console.log('deleting pid file');
        fs.unlinkSync(pid_file_name);
      });
    }
  }

  app.run(argv);
  console.log("Gutsy now listening on", argv.l + ":" + argv.p);
};

exports.run();
