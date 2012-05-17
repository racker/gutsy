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

    utils = require('../utils'),
    settings = require('../settings');

var generate_worker = function(name, devopsjson_url) {
  var options, parsed_url, filename, munged_devopsjson_url;
  parsed_url = url.parse(devopsjson_url);
  options = {
      host: parsed_url.host,
      port: {'https:': 443, 'http:': 80}[parsed_url.protocol],
      path: parsed_url.path,
      method: 'GET',
      headers: {
          'Content-Type': 'application/json'
      }
  };
  filename = path.join(settings.saved_crawls_path, name);
  return function(cb){
    utils.request_maker(options, function(err, results){
      if(err){
        console.error(err);
        return cb(null);
      }
      fs.writeFile(filename, results.data, function (err) {
        if (err) {
          console.error(err);
          return cb(null);
        }
        console.log("Wrote file: ", filename);
        cb(null, 'done');
      });
    });
  };
};

// retrieve devops.json and save it to a file
exports.run = function() {
  var workers, api_name;
  workers = [];
  for (api_name in settings.devopsjson_uris) {
    workers.push(generate_worker(api_name, settings.devopsjson_uris[api_name]));
  }
  async.parallel(workers, function(err, results){
    if (err){
      console.error(err);
    }
    console.log('all done');
    process.exit(0);
  });
};
