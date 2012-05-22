
var _ = require('underscore');

var utils = require('../../utils');
var iface = require('./interface');

/** Adds pagerduty field to devops if pagerduty related api is present
 * @param {string} devops_filename the filename of the devopsjson file relative to the fixtures directory
 * @param {fn} request_maker A function that takes two arguments, options and on_end_cb:
 *   options an options dict for making an XHR, such as would be used by http.request
 *   on_end_cb a callback that gets called with the XHR response data
 */


module.exports = iface.make_poller({
  __poll: function(){
    var self = this;
    var poll_interval = 60 * 60 * 1000;

    // PagerDuty requires the date range for all requests.
    var now, until, options;

    now = new Date();
    until = new Date();
    until.setDate(now.getDate() + 4);
    now = now.toISOString().split('T')[0];
    until = until.toISOString().split('T')[0];

    options = {
      port: self.api_config.port,
      host: self.api_config.subdomain + '.pagerduty.com',
      path: ['/api/v1/schedules/',
             self.api_config.schedule_id,
             '/entries?since=',
             now,
             '&until=',
             until].join(''),
      method: 'GET',
      auth: self.api_config.auth,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    utils.request_maker(
      options,
      function(error, data) {
        if(error){
          self.payload.error = error;
          return;
        }
        try{
          self.payload.data = JSON.parse(data.data);
        } catch (e){
          self.payload.error = e;
          return;
        }
        if (self.payload.data.error) {
          // TODO: does this really exist?
          // pager_duty.data.error.code}: #{pager_duty.data.error.message}
          self.payload.error = JSON.stringify(self.payload.data.error);
          return;
        }

      });
  }
});
