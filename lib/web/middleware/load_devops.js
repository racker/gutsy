var settings = require('../../../settings');
var utils = require('../../utils');
var _ = require('underscore');
var path = require('path');

/**
 * If req.params.project, assigns req.devops to loaded devops object
 */
module.exports = function load_devops(req, res, next) {
  var extcreds;
  var optional_field_defaults = {
      'tags': [],
      'links': {},
      'environments': [],
      'metadata': {},
      'related_apis': {},
      'dependent_services': [],
      'events': [],
      'kpi_spec': '',
      // generic place to put errors
      'errors': [],
      // By convention, middlewares will populate this fields,
      // if the related_apis exist, with {'error': X, 'data': X}
      'pagerduty': null,
      'versionone': null,
      'github': null
    };

  if (req.params && req.params.project) {
    var devops_path = path.join(__dirname, '..', '..', '..', req.devops_directory, req.params.project);
    // set req.devops to devops object
    req.devops = utils.load_devops(devops_path);

    // fill in missing optional fields
    _.defaults(req.devops, optional_field_defaults);

    // fill in __external__ related api creds from local settings
    // if they exist
    if (settings.external_creds && settings.external_creds[req.params.project]) {
      extcreds = settings.external_creds[req.params.project];
      _.each(req.devops.related_apis, function(api_obj, api_name) {
        // is the api name defined in settings?
        if (extcreds[api_name]) {
          _.each(api_obj, function(val, key) {
            if (val === "__external__") {
              if (extcreds[api_name] && extcreds[api_name][key]) {
                req.devops.related_apis[api_name][key] = extcreds[api_name][key];
              }
            }
          });
        }
      });
    }
  }

  next();
};
