/*
 *  Copyright 2011 Rackspace
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

var fs = require('fs');
var path = require('path');
var http = require('http');
var https = require('https');
var url = require('url');
var JSV = require('JSV').JSV;
var _ = require('underscore');

var urls = require('./web/urls');
var settings = require('./settings');
var schema = require('../extern/devopsjson/lib/web/schema').schema;

// A bunch of enum like things for the stats push API (no hidden interfaces via magic strings!)
var HEALTH_UNKNOWN = 0;
var HEALTH_OK = 1;
var HEALTH_WARNING = 2;
var HEALTH_ERROR = 3;

// this sucks
exports.HEALTH_ERROR = HEALTH_ERROR;

var HEALTH_STRING_OK = 'OK';
var HEALTH_STRING_PROBLEM = 'PROBLEM';
var HEALTH_STRING_ERROR = 'ERROR';
var HEALTH_STRING_UNKNOWN = 'UNKNOWN';

exports.HEALTH_STRING_OK = HEALTH_STRING_OK;
exports.HEALTH_STRING_PROBLEM = HEALTH_STRING_PROBLEM;
exports.HEALTH_STRING_ERROR = HEALTH_STRING_ERROR;
exports.HEALTH_STRING_UNKNOWN = HEALTH_STRING_UNKNOWN;

exports.HEALTH_ENUM = {};
exports.HEALTH_ENUM[HEALTH_OK] = HEALTH_STRING_OK;
exports.HEALTH_ENUM[HEALTH_WARNING] = HEALTH_STRING_PROBLEM;
exports.HEALTH_ENUM[HEALTH_ERROR] = HEALTH_STRING_ERROR;
exports.HEALTH_ENUM[HEALTH_UNKNOWN] = HEALTH_STRING_UNKNOWN;

// build an array (of Numbers) to check against
var VALID_HEALTH = _.map(_.keys(exports.HEALTH_ENUM), function(n){return Number(n);});
exports.VALID_HEALTH = VALID_HEALTH;

/**
 * makeClass - By John Resig (MIT Licensed)
 * Takes a function and ensures that new is called so that __this__ is properly bound
 * @param {proto} optional prototype to set on the returned function
 */
exports.make_class = function(proto){
  var f = function(args){
    // did you make me with new?
    if (this instanceof arguments.callee){
      // am I a function?
      if (typeof this.init === "function"){
        //PREGUNTA: why not always pass apply arguments?
        if (args){
          return this.init.apply(this, args.callee ? args : arguments );
        }
        else{
          return this.init.apply(this, arguments);
        }
      }
    } else{
      // didn't use new, return a properly instantiated object
      return new arguments.callee(arguments);
    }
  };
  if (proto){
    f.prototype = proto;
  }
  return f;
};

/** A representation of the stats for a given host: see https://github.com/racker/gutsy/blob/master/docs/example_data_push.js
 * for the format of data
 */
var api_host_properties = exports.make_class({
  /** Constructor which takes a data blob
  * @param {object} data stats for a given host (see link above)
 */
  init: function(data){
    this.validate_data(data);
    _.extend(this, data);
  },
  /** Takes new data, validates it, and updates the local store of any fresh data
  * @param {object} data stats for a given host (see link above)
 */
  handle_new_data: function(data){
    var fresh, that;
    this.validate_data(data);

    fresh = false;
    if (data.timestamp >= this.timestamp){
      fresh = true;
      this.timestamp = data.timestamp;
      this.health = data.health;
      this.ip = data.ip;
      this.metrics = data.metrics;
    }

    that = this;
    _.each(data.services, function(service, service_name){
      var should_update_service = (!that.services[service_name]) ||
        (that.services[service_name].timestamp < service.timestamp);
      if (should_update_service){
        that.services[service_name] = service;
      }
    });
  },
  validate_data: function(data){
    var that = this;
    //TODO: use swiz for this
    if (!data.timestamp){
      throw new Error('You must specify a timestamp');
    }
    if (!data.name){
      throw new Error('You must specify a name');
    }
    data.timestamp = this._validate_time(data.timestamp);
    data.health = this._validate_health(data.health);
    _.each(data.services, function(service, service_name){
      service.timestamp = data.timestamp;
      service.health = that._validate_health(service.health);
    });
  },
  _validate_time: function(time_like){
    // have Date parse the time like thing and convert to a Number or bail
    return (new Date(time_like)).getTime();
  },
  _validate_health: function(health){
    if (VALID_HEALTH.indexOf(health) !== -1){
      return health;
    }
    throw new Error('Health status: ' + health + ' is not valid');
  }
});

/** A representation of the stats for all hosts.  This data is flushed to disk every settings.flush_stats_interval and
 * reloaded from disk at startup
 */
exports.api_cache = exports.make_class({
  init: function(){
    var that = this;
    var data = null;
    var flush_file;
    if(settings.testing){
      flush_file = settings.testing_flush_file_path;
    }else{
      flush_file = settings.flush_file_path;
    }
    this._flush_path = path.join(__dirname, flush_file);
    // try loading flushed data at boot
    try{
      data = fs.readFileSync(this._flush_path);
    } catch(e){
      // if this is the first run, the file may not exist (this is unsafe)
      if (e.code !== 'ENOENT'){
        console.warn('\nCouldn\'t load flushed data!\n');
        throw e;
      }
    }
    if (data !== null && data.length > 0){
      // if we have data, parse it and push into our cache
      data = JSON.parse(data);
      _.each(data, function(project, project_name){
        _.each(project, function(service){
          that.handle_push(project_name, service);
        });
      });
    }
  },
  /** Handles any new data for a given project.
  * @param {string} project the name of the project these stats correspond to
  * @param {object} host_data the given data for a host (see link in api_host_properties docs)
   */
  handle_push: function(project, host_data){
    if (!this._projects[project]){
      this._projects[project] = {};
    }
    if (!this._projects[project][host_data.name]){
      this._projects[project][host_data.name] = new api_host_properties(host_data);
    }
    this._projects[project][host_data.name].handle_new_data(host_data);
  },
  flush_data: function(cb){
    fs.writeFile(this._flush_path, JSON.stringify(this._projects), function(err){
      if (err){
        console.log(err);
      }
      if (cb){
        cb();
      }
    });
  },
  get_service_stats: function(project){
    return this._projects[project];
  },
  get_unhealth_services: function(project){
    var services = this._projects[project];
    var unhealthy = [];
    _.each(services, function(service, service_name){
      if (service.health !== HEALTH_OK){
        unhealthy.push(service);
      }
    });
    return unhealthy;
  },
  // internal representation of all projects' services' stats (this is static)
  // _projects[project_name][host_name] = api_host_properties
  _projects: {}
});

/**
 * Takes a username and password and returns a basic auth token fully formed
 *
 */
exports.create_basic_auth = function(username, password){
  var auth_token = new Buffer(username + ':' + password).toString('base64');
  return "Basic " + auth_token;
};

/**
 * Takes middlware function pointer with arrity of 5 and returns a middleware
 *
 * @param {string} name the name of the middleware (should be unique)
 * @param {fn} the middleware proper which should accept (req, res, next, payload, api_config- set payload.data/errors to cache stuff, api_config = req.devops[name]
 * @return {fn} middleware function
 */
exports.create_middleware = function(name, middleware){
  return function(req, res, next){
    // Do they have the api defined in the devops ball?
    if (!req.devops.related_apis || !req.devops.related_apis[name]) {
      req.devops[name] = null;
      next();
      return;
    }
      var payload = {error: null, data: null};
      req.devops[name] = payload;
      try{
        middleware(req, res, next, payload, req.devops.related_apis[name]);
      }catch (e){
        payload.error = e;
        // TODO: this may not be callable if the error was with express
        next();
      }
  };
};

/**
 * Makes a fake response object which the injector middleware needs (as for unit tests).  Call with new!
 *
 * @return {obj}
 */
 var mock_res = function(){};
 mock_res.prototype = {
  locals: function(obj){
    if (!this._locals){
      this._locals = {};
    }
    if (!obj){
      return this._locals;
    }
    for (var key in obj){
      var val = obj[key];
      if (val===undefined){
        continue;
      }
      this._locals[key] = val;
    }
  }
};
exports.mock_res = mock_res;
/**
 * Takes a relative or absolute devops filename and returns the parsed content
 *
 * @param {string} devops_filename the filename of the devopsjson file relative to the fixtures directory
 * @return {Object} parsed content of JSON file
 */
exports.load_devops = function(devops_path) {
  var devops;
  devops = fs.readFileSync(devops_path);
  devops = JSON.parse(devops);
  return devops;
};

/** A convenience function for making requests without having to build up response body data.
 * Also useful for mocking the making of requests in tests
 * @param {Object} options an options dict such as http.request would use
 * @param {fn} on_success callback that takes the complete response body data as a parameter
 * @param {fn} on_error callback that takes an Exception as a parameter
 */
exports.request_maker = function(options, call_back) {
  var post_data = "";
  var headers = {};
  if ( options.post_data !== undefined ){
    post_data = JSON.stringify(options.post_data);
    delete options.post_data;
  }

  headers['Content-length'] = post_data.length;

  if (options.headers){
    _.extend(options.headers, headers);
  }else{
    options.headers = headers;
  }

  var req = https.request(options, function(res) {
    var data = '';
    res.setEncoding('utf8');
    res.on('data', function(d) {
      data += d;
    });
    res.on('end', function() {
      try{
        call_back(null, {data: data, res: res});
      }catch(e){
        call_back(e, {data: data, res: res});
      }
    });
  });
  req.on('error', function(e) {
    call_back(e, null);
  });

  if (post_data){
    req.write(post_data);
  }
  req.end();
};

/**
 *
 * @param devops_github
 * @param is_closed
 * @returns
 */
exports.github_request_options = function(api_config, uri) {
  var parsed = url.parse(uri || api_config.url);
  var _path = parsed.path === '/' ? [
    "/repos/",
    api_config.org,
    "/",
    api_config.repo,
    '/pulls?state=closed&per_page=100&page=1'
    ].join('') : parsed.path;

  return {
    return_response: true,
    host: parsed.host,
    port: 443,
    path: _path,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': exports.create_basic_auth(api_config.username,
        api_config.apikey)
    }
  };
};
/**
 * @param string
 * @returns new string with first letter capitalized
 */
exports.capitalize = function(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

exports.validate_devops = function(devops){
  var jsv_env = JSV.createEnvironment('json-schema-draft-03');
  var report = jsv_env.validate(devops, schema);

  if (report.errors.length > 0) {
    console.log("ERRORS: ", report.errors);
  }
  return report;
};


/*
 * Javascript Humane Dates
 * Copyright (c) 2008 Dean Landolt (deanlandolt.com)
 * Re-write by Zach Leatherman (zachleat.com)
 *
 * Adopted from the John Resig's pretty.js
 * at http://ejohn.org/blog/javascript-pretty-date
 * and henrah's proposed modification
 * at http://ejohn.org/blog/javascript-pretty-date/#comment-297458
 *
 * Licensed under the MIT license.
 */

exports.humane_date = function(date, compareTo){

  if(!date) {
      return;
  }

  date = isString ?
    new Date(('' + date).replace(/-/g,"/").replace(/[TZ]/g," ")) :
    date;
  compareTo = compareTo || new Date();

  var lang = {
    ago: 'Ago',
    from: '',
    now: 'Just Now',
    minute: 'Minute',
    minutes: 'Minutes',
    hour: 'Hour',
    hours: 'Hours',
    day: 'Day',
    days: 'Days',
    week: 'Week',
    weeks: 'Weeks',
    month: 'Month',
    months: 'Months',
    year: 'Year',
    years: 'Years'
  },
  formats = [
    [60, lang.now],
    [3600, lang.minute, lang.minutes, 60], // 60 minutes, 1 minute
    [86400, lang.hour, lang.hours, 3600], // 24 hours, 1 hour
    [604800, lang.day, lang.days, 86400], // 7 days, 1 day
    [2628000, lang.week, lang.weeks, 604800], // ~1 month, 1 week
    [31536000, lang.month, lang.months, 2628000], // 1 year, ~1 month
    [Infinity, lang.year, lang.years, 31536000] // Infinity, 1 year
  ],
  isString = typeof date === 'string',
  seconds = (compareTo - date + (
      compareTo.getTimezoneOffset() -
      // if we received a GMT time from a string, doesn't include time zone bias
      // if we got a date object, the time zone is built in, we need to remove it.
      (isString ? 0 : date.getTimezoneOffset())
    ) * 60000 ) / 1000,
  token;

  if(seconds < 0) {
    seconds = Math.abs(seconds);
    token = lang.from ? ' ' + lang.from : '';
  } else {
    token = lang.ago ? ' ' + lang.ago : '';
  }

  /*
   * 0 seconds && < 60 seconds        Now
   * 60 seconds                       1 Minute
   * > 60 seconds && < 60 minutes     X Minutes
   * 60 minutes                       1 Hour
   * > 60 minutes && < 24 hours       X Hours
   * 24 hours                         1 Day
   * > 24 hours && < 7 days           X Days
   * 7 days                           1 Week
   * > 7 days && < ~ 1 Month          X Weeks
   * ~ 1 Month                        1 Month
   * > ~ 1 Month && < 1 Year          X Months
   * 1 Year                           1 Year
   * > 1 Year                         X Years
   *
   * Single units are +10%. 1 Year shows first at 1 Year + 10%
   */

  function normalize(val, single)
  {
    var margin = 0.1;
    if(val >= single && val <= single * (1+margin)) {
      return single;
    }
    return val;
  }

  for(var i = 0, format = formats[0]; formats[i]; format = formats[++i]) {
    if(seconds < format[0]) {
      if(i === 0) {
        // Now
        return format[1];
      }

      var val = Math.ceil(normalize(seconds, format[3]) / (format[3]));
      return val + ' ' + (val !== 1 ? format[2] : format[1]) + (i > 0 ? token : '');
    }
  }
};
