
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
      'pagerduty': null
    };

    for (field in fields) {
      devops[field] = devops[field] || fields[field];
    }
    next();
  };
};
