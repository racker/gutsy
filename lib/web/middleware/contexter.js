var urls = require('../urls');

// Fleshes out devops object with defaults for missing optional fields
module.exports = function(devops) {
  return function contexter(req, res, next) {
    var fields, field;
    fields = {
      'tags': [],
      'links': {},
      'environments': [],
      'metadata': {},
      'related_apis': {},
      'dependent_services': [],
      'kpi_spec': '',
      // By convention, middlewares will populate this fields,
      // if the related_apis exist, with {'error': X, 'data': X}
      'pagerduty': null,
      'versionone': null
    };

    for (field in fields) {
      devops[field] = devops[field] || fields[field];
    }

    // create navigation bar
    devops.navbar = {};
    if (devops.related_apis.version_one) {
      devops.navbar.Defects = urls.DEFECTS;
    }
    devops.navbar.DevHealth = urls.DEVHEALTH;

    next();
  };
};
