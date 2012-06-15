var utils = require('../../utils').common;
var db = require('../db');

module.exports = function _service_health(payload) {
  var api_config = payload.get_config();
  var project_name = payload.project_name;
  db.get_service_stats(project_name, function(err, results){
    payload.set_data(err, results);
  });
};

module.exports.poll_interval = 1000 * 10;
