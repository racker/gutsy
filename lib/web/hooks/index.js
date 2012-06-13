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

var github = require('./github');
var log = require('../../log');

exports.install = function(project){
  var to_call = [];
  log.log("Installing hooks...");

  var devops = project.devops;
  if (!devops || !devops.related_apis || !devops.related_apis['github']) {
    return;
  }

  github.install(devops.related_apis['github'], project.name, function(err, results){
    if (err){
      log.error(err, 'installing github hook');
    }
  });

};
