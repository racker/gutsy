var utils = require('../../utils');
var _ = require('underscore');

/** Adds pagerduty field to devops if pagerduty related api is present
 * @param {string} devops_filename the filename of the devopsjson file relative to the fixtures directory
 * @param {fn} request_maker A function that takes two arguments, options and on_end_cb:
 *   options an options dict for making an XHR, such as would be used by http.request
 *   on_end_cb a callback that gets called with the XHR response data
 */

module.exports = function(payload, api_config) {

  // PagerDuty requires the date range for all requests.
  var now, until, options;

  now = new Date();
  until = new Date();
  until.setDate(now.getDate() + 4);
  now = now.toISOString().split('T')[0];
  until = until.toISOString().split('T')[0];

  options = {
    port: api_config.port,
    host: api_config.subdomain + '.pagerduty.com',
    path: ['/api/v1/schedules/',
           api_config.schedule_id,
           '/entries?since=',
           now,
           '&until=',
           until].join(''),
    method: 'GET',
    auth: api_config.auth,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  utils.request_maker(
    options,
    function(error, data) {
      if(error){
        payload.error = error;
        return;
      }
      try{
        payload.data = JSON.parse(data);
      } catch (e){
        payload.error = e;
        return;
      }
      if (payload.data.error) {
        // TODO: does this really exist?
        // pager_duty.data.error.code}: #{pager_duty.data.error.message}
        payload.error = JSON.stringify(payload.data.error);

      } else if (!_.isEmpty(payload.data.entries)){
      // add oncall key to contacts that are oncall
        _.each(payload.data.entries, function(entry) {
          _.each(api_config.contacts, function(contact) {
            _.each(contact.members, function(member) {
              if (member.name === entry.user.name || member.mailto === entry.user.email) {
                member.oncall = true;
              }
            });
          });
        });
      }
    });
};
