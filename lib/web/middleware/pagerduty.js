var utils = require('../../utils');

/** Adds pagerduty field to devops if pagerduty related api is present
 * @param {string} devops_filename the filename of the devopsjson file relative to the fixtures directory
 * @param {fn} request_maker A function that takes two arguments, options and on_end_cb:
 *   options an options dict for making an XHR, such as would be used by http.request
 *   on_end_cb a callback that gets called with the XHR response data
 */
module.exports = function(devops, request_maker) {
  // No-op if PagerDuty creds aren't provided
  if (!devops.related_apis || !devops.related_apis.pager_duty) {
    return function(req, res, next) {
      next();
    };
  }

  // If a request maker isn't provided, use the standard http module
  // This allows tests to mock request making
  request_maker = request_maker || utils.request_maker;

  return function pagerduty(req, res, next) {
    // PagerDuty requires the date range for all requests.
    var now, until, options;

    now = new Date();
    until = new Date();
    until.setDate(now.getDate() + 4);
    now = now.toISOString().split('T')[0];
    until = until.toISOString().split('T')[0];

    options = {
      port: '80',
      host: devops.related_apis.pager_duty.subdomain + '.pagerduty.com',
      path: ['/api/v1/schedules/',
              devops.related_apis.pager_duty.schedule_id,
              '/entries?since=',
              now,
              '&until=',
              until].join(''),
      method: 'GET',
      auth: devops.related_apis.pager_duty.auth,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    devops.pagerduty = {
        'error': null,
        'data': null
    };
    request_maker(
        options,
        function(data) {
          try {
            devops.pagerduty.data = JSON.parse(data);
          } catch (e) {
            devops.pagerduty.error = e;
          }
          next();
        },
        function(e) {
          devops.pagerduty.error = e;
        });

  };
  return pagerduty;
};
