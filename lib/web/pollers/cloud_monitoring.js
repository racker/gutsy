var utils = require('../../utils').common;
var util = require('util');
var _ = require('underscore');

/** Adds pagerduty field to devops if pagerduty related api is present
 * @param {string} devops_filename the filename of the devopsjson file relative to the fixtures directory
 * @param {fn} request_maker A function that takes two arguments, options and on_end_cb:
 *   options an options dict for making an XHR, such as would be used by http.request
 *   on_end_cb a callback that gets called with the XHR response data
 */

module.exports = function(payload) {
  var api_config = payload.get_config();

  options = {
    port: 443,
    host: 'auth.api.rackspacecloud.com',
    path: '/v1.1/auth',
    method: 'POST',
    post_data: util.format('"credentials": {"username": "%s","key": "%s"}}', api_config.username, api_config.apikey),
    headers: {
      'Content-Type': 'application/json'
    }
  };
  console.log(options);
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
      payload.set_data(null, parsed_data);
    }
  );
};

module.exports.poll_interval = 10 * 60 * 1000;
