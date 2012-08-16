var utils = require('../../utils').common;
var util = require('util');
var _ = require('underscore');


module.exports = {
  name: 'cloud_monitoring',
  poll_interval: 5 * 60 * 1000,
  related_apis: ['cloud_monitoring'],
  priority: 1,
  worker:  function _cloud_monitoring(payload) {
    var api_config = payload.get_config();

    options = {
      port: 8000,
      host: 'dashboard.rax.io',
      path: ['/', api_config.scriptname, '.json'].join(''),
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    utils.request_maker(
      options,
      function(err, data) {
        var parsed_data;
        if(err){
          payload.set_data(err);
          return;
        }
        try{
          parsed_data = JSON.parse(data.data);
        } catch (e){
          payload.set_data(e);
          return;
        }
        payload.set_data(err, parsed_data);
      }
    );
  }
};

module.exports.poll_interval = 10 * 60 * 1000;
