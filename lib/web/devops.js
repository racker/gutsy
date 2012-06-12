var settings = require('../settings');
var utils = require('../utils').common;
var _ = require('underscore');
var path = require('path');

var db = require('./db');
var log = require('../log');

var make_defaults = function(){
  return {
    tags:  [],
    links:  {},
    environments:  [],
    metadata:  {},
    related_apis:  {},
    dependent_services:  [],
    events:  [],
    contacts: [],
    kpi_spec:  '',
    errors:  [],
    pager_duty:  null,
    version_one:  null,
    github:  null,
    new_relic:  null,
    dreadnot:  null,
    release_notes: null
  };
};

/**
 * If req.params.project, assigns req.devops to loaded devops object
 */
exports.load = function load(project) {
  log.log("Loading fixtures...");

  var api_name;
  var api_obj;
  var devops_json = project.devops_json ? JSON.parse(project.devops_json): {};
  var project_name = project.name;

  // fill in missing optional fields
  _.defaults(devops_json, make_defaults());

  // fill in __external__ related api creds from local settings
  // if they exist
  if (project.creds) {
    project.creds = JSON.parse(project.creds);
    for (api_name in devops_json.related_apis){
      api_obj = devops_json.related_apis[api_name];
      if (project.creds[api_name]){
        _.extend(api_obj, project.creds[api_name]);
      }
      devops_json[api_name] = api_obj;
    }
  }
  if (devops_json.related_apis.github !== undefined) {
    devops_json.related_apis.github.repo = [].concat(devops_json.related_apis.github.repo);
  }

  PROJECTS[project_name] = project;
  PROJECTS[project_name].devops = devops_json;
  return project;
};
