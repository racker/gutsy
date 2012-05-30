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


var http = require('http'),
    https = require('https'),
    fs = require('fs'),
    path = require('path'),
    url = require('url'),

    async = require('async'),
    _ = require('underscore'),

    log = require('../log'),
    utils = require('../utils'),
    settings = require('../settings');

var generate_worker = function(project) {
  var options, parsed_url, filename, munged_devopsjson_url;
  parsed_url = url.parse(project.url);
  options = {
      host: parsed_url.host,
      port: 443,
      path: parsed_url.path,
      method: 'GET',
      headers: {
          'Content-Type': 'application/json'
      }
  };

  if (parsed_url.port) {
    options.port = parsed_url.port;
  }
  else if (parsed_url.protocol) {
    options.port = {'https:': 443, 'http:': 80}[parsed_url.protocol] || options.port;
  }

  return function(cb){
    utils.request_maker(options, function(err, results){
      if(err){
        log.error(err);
        return cb(null);
      }
      try {
        JSON.parse(results.data);
      } catch (e) {
        log.error(e);
        return cb(null);
      }
      db.update_devops(project.id, project.project, project.url, results.data, function (err, results) {
        if (err) {
          log.error("Error saving data for project: ", name, err);
        }
        else {
          log.log("Saved data for project: ", name);
        }
        cb(null, 'done');
      });
    });
  };
};

// retrieve devops.json and save it to a file
exports.run = function(argv, exit) {
  var workers, api_name;
  workers = [];
  db.get_devops(undefined, function (err, results) {
    var i;
    for (i = 0; i < results.length; i++) {
      workers.push(generate_worker(results[i]));
    }
    async.parallel(workers, function(err, results){
      if (err){
        log.error(err);
      }
      log.log('all done');
      if (exit) {
        process.exit(0);
      }
    });
  });
};
