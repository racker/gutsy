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

var async = require('async');
var _ = require('underscore');

var express = require('express');

var devops = require('./devops');
var log = require('../log');
var utils = require('../utils').common;
var settings = require('../settings');
var pollers = require('./pollers');
var hooks = require('./hooks');
var db = require('./db');
var crawler = require('../crawler/app');
var Project = require('./project').Project;

var load = function(db_project, cb){
  project = new Project(db_project);
  PROJECTS[project.name] = project;
  //PROJECTS[project.id] = project;
  cb(undefined, project);
};

var load_projects = function(cb){
  db.get_projects(function(err, projects){
    if (err){
      log.error(err);
    }
    var parallel = [];

    _.each(projects, function(project){
      parallel.push(function(cb){
        load(project, cb);
      });
    });
    async.parallel(parallel, cb);
  });
};

exports.delete_project = function(project_id, cb){
  db.get_project(project_id, function(err, project){
    if (PROJECTS[project.name] !== undefined){
      pollers.uninstall(project);
      delete PROJECTS[project.name];
    }
    db.delete_project(project_id, cb);
  });
};

exports.update_project = function(id, name, url, devops, creds, cb){
  db.update_project(id, name, url, devops, creds, function (err, project) {
    if (project.old_name !== project.name) {
      PROJECTS[project.name] = PROJECTS[project.old_name];
      PROJECTS[project.name].name = project.name;
      delete PROJECTS[project.old_name];
    }
    return PROJECTS[project.name].pollers.crawler.poll(cb, true);
  });
};

exports.add_project = function(name, url, devops, creds, cb){
  async.waterfall([
    function(cb){
      db.add_project(name, url, devops, creds, cb);
    },
    crawler.get],
  function(err, project){
    load(project, cb);
  });
};

exports.install = function (cb) {
  var series = [
    _.bind(db.create_tables, db),
    load_projects
  ];

  log.log("Initializing...");

  async.series(series, function (err, results) {
    if (err) {
      log.error(err, "init");
    }
    if (cb) {
      return cb(err, results);
    }
  });
};