
var _ = require('underscore');

var utils = require('./utils');

function_name_regex = /\s*(function\s*\(.*\))/;

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

var log_level = log_levels.log;

var set_log_level = function (new_log_level) {
    if (log_levels[new_log_level]) {
        log_level = new_log_level;
    }
    else {
        utils.die(new_log_level, "is not a valid log level");
    }
};

var log = function (level, args) {
    var now = new Date();
    var caller;
    args = Array.prototype.slice.call(args);

    if (args[0] === undefined) {
        caller = arguments.callee.caller.match(function_name_regex);
        caller = caller || caller[0];
        console.error(caller, "called log with no message");
        return;
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

    if (level >= log_level) {
        args.unshift(log_levels_to_string[log_level], now);
        log_fn.apply(null, args);
    }
};

_.each(log_levels, function (value, key) {
    exports[key] = function () {
        log(log_levels[key], arguments);
    };
});

exports.set_log_level = set_log_level;
