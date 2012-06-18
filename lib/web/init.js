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

var log = require('../log');
var utils = require('../utils').common;
var settings = require('../settings');
var pollers = require('./pollers');
var hooks = require('./hooks');
var db = require('./db');
var Project = require('./project').Project;

var PROJECTS = [];

var get_project = function(id){
  var project;
  var i;
  for (i=0;i<PROJECTS.length; i++){
    if (PROJECTS[i].id === id){
      return PROJECTS[i];
    }
  }
};

var load = function(db_project, cb){
  var project = new Project(db_project);
  project.start(cb);
};

var load_projects = function(cb){
  db.get_projects(function(err, projects){
    if (err){
      log.error(err);
    }
    var parallel = [];

    _.each(projects, function(project){
      parallel.push(_.bind(load, null, project));
    });
    async.parallel(parallel, cb);
  });
};

exports.delete_project = function(project_id, cb){
  var project = get_project(project_id);
  if (project !== undefined){
    project.uninstall();
    PROJECTS.splice(PROJECTS.indexOf(project), 1);
  }
  db.delete_project(project_id, cb);
};

exports.add_project = function(name, url, devops, creds, cb){
  db.add_project(name, url, devops, creds, function (err, db_project) {
    if (err){
      log.error(err);
      return cb(err, db_project);
    }
    load(db_project, function(err, project){
      PROJECTS.push(project);
      return cb(err, project);
    });
  });
};

exports.update_project = function(id, name, url, devops_json, creds, cb){
  var project = get_project(id);
  project.update(id, name, url, devops_json, creds, cb);
};

exports.install = function (cb) {
  log.log("Initializing...");
  db.create_tables(function(){
    load_projects(function(err, projects){
      PROJECTS = projects;
      cb(err, projects);
    });
  });
};