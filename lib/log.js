
var _ = require('underscore');

var log_levels = {
    error: 0,
    warn: 1,
    message: 2,
    debug: 3
};

var log_levels_to_string = {};

_.each(log_levels, function (value, key) {
    log_levels_to_string[value] = key;
});

exports.log_levels = log_levels;

var log_level = log_levels.message;

var log = function (level, msg) {
    var now = new Date();

    if (msg === undefined) {
        //TODO: log the function that gave an empty message
    }

    switch (level) {
        case log_levels.error:
            log_fn = console.error;
        break;
        case log_levels.warn:
            log_fn = console.warn;
        break;
        case log_levels.message:
            log_fn = console.log;
        break;
        case log_levels.debug:
            log_fn = console.log;
        break;
        default:
            console.error("Invalid log level:", level);
            return;
    }

    if (level > log_level) {
        log_fn(log_levels_to_string[log_level], now, msg);
    }
};

exports.log = log;

exports.error = function (msg) {
    log(log_levels.error, msg);
};

exports.warn = function (msg) {
    log(log_levels.warn, msg);
};

exports.message = function (msg) {
    log(log_levels.message, msg);
};

exports.debug = function (msg) {
    log(log_levels.debug, msg);
};
