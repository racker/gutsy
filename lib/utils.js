var fs = require('fs');
var path = require('path');
var http = require('http');
var https = require('https');
var urls = require('./web/urls');
var schema = require('../extern/devopsjson/lib/web/schema').schema;
var JSV = require('JSV').JSV;
var _ = require('underscore');


/**
 * makeClass - By John Resig (MIT Licensed)
 * Takes a function and ensures that new is called so that __this__ is properly bound
 * @param {fn} the function to safely wrap
 */
exports.make_class = function(){
  return function(args){
    // did you make me with new?
    if ( this instanceof arguments.callee ) {
      // am I a function?
      if ( typeof this.init === "function" ){
          this.init.apply( this, args.callee ? args : arguments );
        }
    } else{
      // didn't use new, return a properly instantiated object
      return new arguments.callee( arguments );
    }
  };
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

/**
 * Makes a fake response object which the injector middleware needs (as for unit tests).  Call with new!
 *
 * @return {obj}
 */
 var mock_res = function(){};
 mock_res.prototype.locals = function(obj){
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
  var req = {'443': https, '80': http}[options.port].get(options, function(res) {
    var data = '';
    res.setEncoding('utf8');
    res.on('data', function(d) {
      data += d;
    });
    res.on('end', function() {
      //TODO:  this is pretty strange, change me.
      try{
        call_back(null, data);
      }catch(e){
        call_back(e, data);
      }
    });
  }).on('error', function(e) {
    call_back(e, null);
  });
};

/**
 *@param project {string} Project name (should match devops.json file name)
 *@param devops {Object} devops.json object
 */
exports.create_navbar = function(project, devops) {
  var navbar;
  var related_apis = devops.related_apis;
  navbar = {};
  navbar[exports.capitalize(project)] = '/p/' + project;

  if (related_apis.version_one) {
    navbar.Defects = urls.DEFECTS.replace(':project', project);
  }
  if (related_apis.github) {
    navbar.DevHealth = urls.DEVHEALTH.replace(':project', project);
  }
  if (related_apis.dreadnot){
    navbar.Dreadnot = urls.DEPLOYMENT.replace(':project', project);
  }
  return navbar;
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
