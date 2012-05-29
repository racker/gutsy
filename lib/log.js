
var _ = require('underscore');

var utils = require('./utils');

function_name_regex = /\s*(function[^\(\)]*\([^\(\)]*\))/;

var log_levels = {
  error: 0,
  warn: 1,
  log: 2,
  debug: 3
};

var log_levels_to_string = {};

_.each(log_levels, function (value, key) {
  log_levels_to_string[value] = "__" + key + "__";
});

var log_level = "log";

var set_log_level = function (new_log_level) {
  if (log_levels[new_log_level] === undefined) {
    utils.die(new_log_level, "is not a valid log level");
  }
  else {
    log_level = log_levels[new_log_level];
  }
};

var log = function (level, args, caller) {
  var now = new Date();
  args = Array.prototype.slice.call(args);

  if (args.length === 0) {
    args.push(caller, "called log with no message");
    level = log_levels.error;
  }

  switch (level) {
    case log_levels.error:
      log_fn = console.error;
    break;
    case log_levels.warn:
      log_fn = console.warn;
    break;
    case log_levels.log:
      log_fn = console.log;
    break;
    case log_levels.debug:
      log_fn = console.log;
    break;
    default:
      console.error("Invalid log level:", level);
    return;
  }

  if (level <= log_level) {
    args.unshift(log_levels_to_string[log_level], now);
    log_fn.apply(null, args);
  }
};

_.each(log_levels, function (value, key) {
  exports[key] = function () {
    var caller = arguments.callee.caller.toString().match(function_name_regex);
    caller = caller === undefined ? caller : caller[0];
    log(log_levels[key], arguments, caller);
  };
});

exports.set_log_level = set_log_level;
