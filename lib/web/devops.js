var settings = require('../settings');
var utils = require('../utils').common;
var _ = require('underscore');
var path = require('path');

var db = require('./db');
var log = require('../log');

var make_defaults = utils.make_class({
  init: function(){
    var self = this;
    self.tags =  [];
    self.links =  {};
    self.environments =  [];
    self.metadata =  {};
    self.related_apis =  {};
    self.dependent_services =  [];
    self.events =  [];
    self.kpi_spec =  '';

    self.errors =  [];
    // By convention, middlewares will populate this fields,
    // if the related_apis exist, with {'error': X, 'data': X}
    self.pager_duty =  null;
    self.version_one =  null;
    self.github =  null;
    self.new_relic =  null;
    self.dreadnot =  null;
  }
});

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
  _.defaults(devops_json, new make_defaults());

  // fill in __external__ related api creds from local settings
  // if they exist
  if (project.creds) {
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
