var utils = require('../../utils').common;
var util = require('util');
var _ = require('underscore');

/** Adds pagerduty field to devops if pagerduty related api is present
 * @param {string} devops_filename the filename of the devopsjson file relative to the fixtures directory
 * @param {fn} request_maker A function that takes two arguments, options and on_end_cb:
 *   options an options dict for making an XHR, such as would be used by http.request
 *   on_end_cb a callback that gets called with the XHR response data
 */

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
