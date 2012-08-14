var utils = require('../../utils').common;
var db = require('../db');

module.exports = {
  name: 'service_health',
  poll_interval: 10 * 1000,
  related_apis: [],
  priority: 0,
  worker: function _service_health(poller) {
    var api_config = poller.get_config();
    var project_name = poller.get_project_name();
    db.get_service_stats(project_name, function(err, results){
      poller.set_data(err, results);
    });
  }
};