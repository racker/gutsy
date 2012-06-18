var child_process = require('child_process');
var fs = require('fs');
var path = require('path');

var optimist = require('optimist');
var _ = require('underscore');

var app = require('./web/app');
var settings = require('./settings');
var log = require('./log');
var utils = require('./utils').common;

exports.run = function run() {
  var argv;
  var child_args;
  var error_file;
  var log_file;
  var log_level;
  var pid_file_name;
  var pid_file;

  optimist = optimist.usage('Usage: $0 [-l 0.0.0.0] [-D] [-c] [-h]');
  optimist = optimist['default']('l', '0.0.0.0');
  optimist = optimist.describe('l', 'Listening address');
  optimist = optimist['default']('c', false);
  optimist = optimist['default']('h', false);
  optimist = optimist['default']('D', false);
  optimist = optimist.describe('D', 'Detach and run as a service');
  optimist = optimist.describe('p', 'Port to listen for Github web hooks on');
  optimist = optimist.describe('log-file', 'File to log output to');
  optimist = optimist.describe('error-file', 'File to log error output to');
  optimist = optimist.describe('pid-file', 'File to log process id to');
  optimist = optimist.alias('h', 'help');
  optimist = optimist.describe('h', 'Print usage help');
  argv = optimist.argv;

  if (argv.h) {
    optimist.showHelp(log.log);
    process.exit();
  }

  if (argv.D) {
    child_args = process.argv.slice(2);
    child_args = child_args.filter(function (element) {
      return (element !== '-D');
    });

    child_process.fork(__dirname + '/entry.js', child_args);
    process.exit();
  }

  log_level = argv['log-level'] || settings.log_level;
  if (log_level === undefined) {
    utils.die('No log level specified. Set log_level in settings.js or use --log-level=debug');
  }
  log.set_log_level(log_level);

  if (argv['log-file']) {
    log_file = fs.createWriteStream(argv['log-file'], { flags: 'a' });

    // process.stderr.pipe(log_file) doesn't work in node 0.6 and later
    process.__defineGetter__('stdout', function() { return log_file; });
    process.__defineGetter__('stderr', function() { return log_file; });
  }

  if (argv['error-file']) {
    error_file = fs.createWriteStream(argv['error-file'], { flags: 'a' });
    process.__defineGetter__('stderr', function() { return error_file; });
  }

  if (argv['pid-file']) {
    pid_file_name = argv['pid-file'];
    try {
      fs.readFileSync(pid_file_name);
      log.log('Process id file', pid_file_name, "already exists! Exiting.");
      process.exit(1);
    }
    catch (e) {
      pid_file = fs.writeFileSync(pid_file_name, process.pid);
      process.on('exit', function () {
        log.log('deleting pid file');
        fs.unlinkSync(pid_file_name);
      });
    }
  }

  app.run(argv);
  log.log("Gutsy now listening on", argv.l + ":443");
};

exports.run();
