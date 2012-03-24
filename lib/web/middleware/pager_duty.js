var utils = require('../../utils');
var _ = require('underscore');

/** Adds pager_duty field to devops if pager_duty related api is present
 * @param {string} devops_filename the filename of the devopsjson file relative to the fixtures directory
 * @param {fn} request_maker A function that takes two arguments, options and on_end_cb:
 *   options an options dict for making an XHR, such as would be used by http.request
 *   on_end_cb a callback that gets called with the XHR response data
 */
module.exports = function pager_duty(req, res, next) {
  // No-op if PagerDuty creds aren't provided
  if (!req.devops.related_apis || !req.devops.related_apis.pager_duty) {
    return next();
  }

  // PagerDuty requires the date range for all requests.
  var now, until, options;

  now = new Date();
  until = new Date();
  until.setDate(now.getDate() + 4);
  now = now.toISOString().split('T')[0];
  until = until.toISOString().split('T')[0];


  options = {
    port: req.devops.related_apis.pager_duty.port,
    host: req.devops.related_apis.pager_duty.subdomain + '.pagerduty.com',
    path: ['/api/v1/schedules/',
           req.devops.related_apis.pager_duty.schedule_id,
           '/entries?since=',
           now,
           '&until=',
           until].join(''),
    method: 'GET',
    auth: req.devops.related_apis.pager_duty.auth,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  req.devops.pager_duty = {
      'error': null,
      'data': null
  };
  utils.request_maker(
      options,
      function(data) {
        var err;
        try {
          req.devops.pager_duty.data = JSON.parse(data);
          // add oncall key to contacts that are oncall
          if (req.devops.pager_duty.data.entries) {
            _.each(req.devops.pager_duty.data.entries, function(entry) {
              _.each(req.devops.contacts, function(contact) {
                _.each(contact.members, function(member) {
                  if (member.name === entry.user.name || member.mailto === entry.user.email) {
                    member.oncall = true;
                  }
                });
              });
            });
          }
          if (req.devops.pager_duty.data.error) {
            JSON.stringify(req.devops.pager_duty.data.error);
            req.devops.errors.push(err);
            req.devops.pager_duty.error = err;
          }
        } catch (e) {
          req.devops.errors.push(e);
          req.devops.pager_duty.error = e;
        }
        next();
      },
      function(e) {
        req.devops.errors.push(e);
        req.devops.pager_duty.error = e;
        next();
      });
};
