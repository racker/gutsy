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

var _ = require('underscore');
var async = require('async');

var settings = require('../../settings');
var github = require('./github');
var log = require('../../log');

exports.install = function(devops, cb){
  var to_call = [];

  _.each(PROJECTS, function(project, project_name){
    var this_devops = project.devops;
    if (!this_devops || !this_devops.related_apis || !this_devops.related_apis['github']) {
      return;
    }

    to_call.push(function (github_cb) {
      github.install(this_devops.related_apis['github'], github_cb);
    });
  });

  async.parallel(to_call, function (err, results) {
    if (err) {
      log.error(err);
    }
    cb(null, devops);
  });
};
