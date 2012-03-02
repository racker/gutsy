var urls = require('./urls');

// Fleshes out devops object with defaults for missing optional fields
module.exports = function(devops, project) {
  var fields, field;
  fields = {
    'tags': [],
    'links': {},
    'environments': [],
    'metadata': {},
    'related_apis': {},
    'dependent_services': [],
    'events': [],
    'kpi_spec': '',
    // By convention, middlewares will populate this fields,
    // if the related_apis exist, with {'error': X, 'data': X}
    'pagerduty': null,
    'versionone': null,
    'github': null
  };

  for (field in fields) {
    devops[field] = devops[field] || fields[field];
  }

  // create navigation bar
  devops.navbar = {};
  devops.navbar[project] = '/' + project;
  if (devops.related_apis.version_one) {
    devops.navbar.Defects = urls.DEFECTS.replace(':project', project);
  }
  if (devops.related_apis.github) {
    devops.navbar.DevHealth = urls.DEVHEALTH.replace(':project', project);
  }
};
