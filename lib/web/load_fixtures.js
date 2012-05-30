var settings = require('../settings');
var utils = require('../utils');
var _ = require('underscore');
var path = require('path');

var db = require('./db');

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
module.exports = function load_fixtures(cb) {
  var extcreds;

  db.get_projects(undefined, function (err, results) {
    _.each(results, function(row){
      var api_name;
      var api_obj;
      var devops_json = row.devops_json ? JSON.parse(row.devops_json): {};
      var project_name = row.name;

      // fill in missing optional fields
      _.defaults(devops_json, new make_defaults());

      // fill in __external__ related api creds from local settings
      // if they exist
      // TODO: move external_creds into DB
      if (settings.external_creds && settings.external_creds[project_name]) {
        extcreds = settings.external_creds[project_name];
        for (api_name in devops_json.related_apis){
          api_obj = devops_json.related_apis[api_name];
          if (extcreds[api_name]){
            _.extend(api_obj, extcreds[api_name]);
          }
          devops_json[api_name] = api_obj;
        }
      }
      PROJECTS[project_name] = row;
      PROJECTS[project_name].devops = devops_json;
    });

    cb(null, null);
  });
};
