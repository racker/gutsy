var settings = require('../settings');
var utils = require('../utils').common;
var constants = require('../utils').constants;
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
    release_notes: null,
    needs_creds: false
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

  project.creds = JSON.parse(project.creds);

  for (api_name in devops_json.related_apis){
    api_obj = devops_json.related_apis[api_name];

    _.each(api_obj, function (value, key) {
      if (value === constants.EXTERNAL_TOKEN) {
        if (!project.creds || !project.creds[api_name] || project.creds[api_name][key] === undefined) {
          devops_json.needs_creds = true;
        } else {
          api_obj[key] = project.creds[api_name][key];
        }
      }
    });
    devops_json[api_name] = api_obj;
  }

  if (devops_json.related_apis.github !== undefined) {
    devops_json.related_apis.github.repo = [].concat(devops_json.related_apis.github.repo);
  }

  PROJECTS[project_name] = project;
  PROJECTS[project_name].devops = devops_json;
  return project;
};
