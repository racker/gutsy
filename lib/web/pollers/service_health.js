var utils = require('../../utils');
var db = require('../db');

module.exports = function _service_health(payload) {
  var api_config = payload.get_config();
  db.get_service_stats(api_config.project_name, function(err, results){
    payload.set_data(err, results);
  });
};

module.exports.poll_interval = 1000 * 10;
