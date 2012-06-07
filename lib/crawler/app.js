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

var http = require('http');
var https = require('https');
var fs = require('fs');
var path = require('path');
var url = require('url');

var async = require('async');
var _ = require('underscore');

var db = require('../web/db');
var log = require('../log');
var utils = require('../utils').common;
var settings = require('../settings');

var get_project = function(project, cb) {
  var options, parsed_url;
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

  utils.request_maker(options, function(err, results){
    if(err){
      log.error(err, "Error crawling:");
      results = {data: undefined};
    }
    else {
      try {
        JSON.parse(results.data);
      } catch (e) {
        log.error(e, "Error parsing JSON when crawling:");
        err = e;
        results.data = undefined;
      }
    }
    db.update_project(project.id, project.name, project.url, results.data, undefined, err, function (db_err, results) {
      if (db_err) {
        log.error(db_err, "Error saving data for project: ", project.name);
      }
      else {
        log.log("Saved data for project: ", project.name);
      }
      return cb(err || db_err, null);
    });
  });
};

exports.get_project = get_project;
// retrieve devops.json and save it to a file
exports.run = function(cb) {
  var workers, api_name;
  workers = [];
  db.get_projects(function (err, projects) {
    var i;
    var crawl_queue = async.queue(get_project, Infinity);
    crawl_queue.drain = function (err, results) {
      log.log('all done');
      if (cb) {
        return cb(err, results);
      }
    };
    if (projects.length < 1) {
      return cb(null, null);
    }
    _.each(projects, function (project) {
      crawl_queue.push(project, function (db_err, err) {
      });
    });
  });
};
