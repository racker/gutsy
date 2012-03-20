var base = require('./base');
var nock = require('nock');

exports.test_example_minimum = function(test, assert) {
  base.run_test(test, assert, 'example-minimum.json', 'pagerduty', 'pagerduty', _success_mock, false);
};

exports.test_example_simple = function(test, assert) {
  base.run_test(test, assert, 'example-simple.json', 'pagerduty', 'pagerduty', _success_mock, false);
};

exports.test_example_full_success = function(test, assert) {
  base.run_test(test, assert, 'example-full.json', 'pagerduty', 'pagerduty', _success_mock, true);
};

exports.test_example_full_error = function(test, assert) {
  base.run_test(test, assert, 'example-full.json', 'pagerduty', 'pagerduty', _error_mock, true, true);
};

function _create_mock(req, status, res) {
  var mock, now, until;

  if (!req.devops.related_apis || !req.devops.related_apis.pager_duty) {
    mock = null;
  } else {
    now = new Date();
    until = new Date();
    until.setDate(now.getDate() + 4);
    now = now.toISOString().split('T')[0];
    until = until.toISOString().split('T')[0];

    mock = nock(
        [{80: 'http', 443: 'https'}[req.devops.related_apis.pager_duty.port],
         '://',
         req.devops.related_apis.pager_duty.subdomain + '.pagerduty.com'].join(''));
    mock = mock.get(
        ['/api/v1/schedules/',
         req.devops.related_apis.pager_duty.schedule_id,
         '/entries?since=',
         now,
         '&until=',
         until].join(''));
    mock = mock.reply(status, res);
    //mock = mock.log(console.log);
  }
  return mock;
};

function _success_mock(req) {
  return _create_mock(
      req,
      200,
      '{"entries": [{"user": {"name": "Zaphod"}, "start": "starttime", "end": "endtime"}]}');
};

function _error_mock(req) {
  return _create_mock(
      req,
      500,
      '{["error": {"message": "API returned error", "code": 22}}');
};
