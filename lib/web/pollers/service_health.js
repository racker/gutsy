var utils = require('../../utils').common;
var db = require('../db');

module.exports = function _service_health(payload, cb) {
  var api_config = payload.get_config();
  var project_name = payload.get_project_name();
  db.get_service_stats(project_name, function(err, results){
    payload.set_data(err, results, cb);
  });
};

module.exports.poll_interval = 1000 * 10;
