var utils = require('../../utils').common;
var util = require('util');
var _ = require('underscore');
var url = require('url');


module.exports = {
  name: 'ruok',
  poll_interval: 5 * 60 * 1000,
  related_apis: ['ruok'],
  priority: 1,
  worker:  function _ruok(payload) {
    var environments = payload.get_config();
    _.each(environments, function(datacenters) {
      _.each(datacenters, function(datacenter) {
        datacenter = url.parse(datacenter);
        options = {
          port: datacenter.port,
          host: datacenter.hostname,
          path:  datacenter.path,
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
        });
      });
    });
  }
};

module.exports.poll_interval = 10 * 60 * 1000;
