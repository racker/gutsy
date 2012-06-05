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

var crawler = require('../crawler/app');
var log = require('../log');
var devops = require('./devops');
var pollers = require('./pollers');
var hooks = require('./hooks');
var db = require('./db');

var project_loader_factory = function(project_id){
  return function(cb){
    log.log("Initializing... ", project_id);
    async.waterfall([
      _.bind(db.get_project, db, project_id),
      crawler.crawl_project,
      devops.load,
      pollers.install,
      hooks.install],
      function(err, project){
        debugger;
        if (err){
          log.error(err);
        }
        if (project !== undefined){
          project_unloader(project.id);
          PROJECTS[project.name] = project;
        }
      return cb(err, project);
      }
    );
  };
};
exports.project_loader_factory = project_loader_factory;

var project_unloader = function(project_id, cb){
  var existing_project;
  for (var i=0; i<PROJECTS.length; i++){
    if (project.id === project_id){
      existing_project = project;
      break;
    }
  }
  if (existing_project && existing_project.interval_id){
    clearTimeout(existing_project.interval_id);
    delete PROJECTS[project.name];
  }
  if (cb){
    cb();
  }
};
exports.project_unloader = project_unloader;

var install_projects = function (cb){
  var project_installers = [];
  var q = async.queue(function(installer, cb){
    installer(cb);
  }, 10);
  q.drain = cb;
  db.get_db().get("SELECT id FROM projects;", function(err, results){
    if (results === undefined){
      return cb();
    }
    _.each(results, function(project_id){
      var installer = project_loader_factory(project_id);
      q.push(installer);
    });
  });
};

exports.install_projects = install_projects;