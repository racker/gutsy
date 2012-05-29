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
var util = require('util');

var JSV = require('JSV').JSV;
var _ = require('underscore');
var et = require('elementtree');

var log = require('./log');
var urls = require('./web/urls');
var settings = require('./settings');
var schema = require('../extern/devopsjson/lib/web/schema').schema;

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

exports.die = function (msg) {
  console.error("DYING because:", msg);
  process.exit(1);
};

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

exports.parse_v1 = function(data, cb){
  var etree;
  var assets;
  try{
    etree = et.parse(data);
    assets = etree.getroot().findall('./Asset').map(V1Asset);
  }catch(e){
    return cb(e);
  }
  return cb(null, assets);
};

/** an asset is a generic v1 object */
var V1Asset = exports.make_class({
  init: function(element){
    var self = this;
    self.attributes = {};
    self.relations = {};

    if (!element){
      return;
    }
    if (!element.tag || element.tag !== 'Asset'){
      return;
    }
    self.href = element.attrib.href;
    self.id = element.attrib.id;
    self.idref = element.attrib.idref;
    self.attributes = element.findall('./Attribute').map(self.make_attribute).reduce(self.reduce_attributes, {});
    self.relations = element.findall('./Relation').map(self.make_relation).reduce(self.reduce('asset'), {});
    self.text = element.text;
    },
  reduce: function(attr){
    return function(hash, named){
      hash[named.name] = named[attr];
      return hash;
    };
  },
  reduce_attributes: function (previous, current) {
    previous[current.name] = {
      text: current.text,
      values: current.values
    };
    return previous;
  },
  make_attribute: function(ele){
    return {
      name: ele.attrib.name,
      text: ele.text,
      values: ele.findall("Value").map(function(element) { return element.text; })
    };
  },
  make_relation: function(ele){
    var assets = ele.findall('./Asset');
    return {
      name: ele.attrib.name,
      asset: assets.map(function(asset){return new V1Asset(asset);})
    };
  }
});

exports.v1_scope_maker = function(scope_list) {
  var scopes = [];
  _.each(scope_list, function(scope) {
      scopes.push(util.format("'Scope:%s'", scope));
    }
  );
  return scopes.join(",");
};

exports.version_one_match = function(string){
  var match = string.match(/([B|D])[ -_]?([0-9]+)/);
  var type, number;

  if (!match){
    return null;
  }
  type = match[1];
  number = match[2];

  if (number.length < 4 || number.length > 7){
    return null;
  }
  return {
    type: type,
    number: number,
    long_name: type === 'B' ? 'Story' : "Defect"
  };
};

exports.v1_id_to_url = function(api_config, id){
  var type = id.split(":")[0];
  var _url =  util.format("https://%s/%s/%s.mvc/Summary?oidToken=%s", api_config.host,
    api_config.name, type, id);
  return encodeURI(_url);
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
  var method;
  var req;

  if ( options.post_data !== undefined ){
    post_data = JSON.stringify(options.post_data);
    delete options.post_data;
  }
  if (options.method && options.method.toUpperCase() !== "GET"){
    headers['Content-length'] = Buffer.byteLength(post_data, 'utf8');
  }

  if (!options.headers) {
    options.headers = {};
  }
  _.extend(options.headers, headers);

  method = options.port === 80 ? http : https;
  log.debug(options);

  req = method.request(options, function(res) {
    var data = '';
    res.setEncoding('utf8');
    res.on('data', function(d) {
      data += d;
    });
    res.on('end', function() {
      if (res.statusCode >= 400) {
        var request = options.host + options.path;
        var error = Error("Bad status code: " + res.statusCode + " for url: " + request);
        return call_back(error, {data: data, res: res});
      }
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

/*
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
    log.error("ERRORS: ", report.errors);
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
