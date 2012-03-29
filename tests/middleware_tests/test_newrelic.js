var base = require('./base');
var nock = require('nock');

exports.test_example_minimum = function(test, assert) {
  base.run_test(test, assert, 'example-minimum.json', 'new_relic', 'new_relic', _success_mock, false);
};

exports.test_example_simple = function(test, assert) {
  base.run_test(test, assert, 'example-simple.json', 'new_relic', 'new_relic', _success_mock, false);
};

exports.test_example_full_success = function(test, assert) {
  base.run_test(test, assert, 'example-full.json', 'new_relic', 'new_relic', _success_mock, true);
};

function _create_mock(req, status, res) {
  var mock;

  if (!req.devops.related_apis || !req.devops.related_apis.new_relic) {
    mock = null;
  } else {
    mock = nock('https://rpm.newrelic.com');
    mock = mock.get(["/accounts",
                     req.devops.related_apis.new_relic.accountId,
                     "applications",
                     req.devops.related_apis.new_relic.appid,
                     "threshold_values.xml"
                     ].join("/"));
    mock = mock.reply(status, res);
    //mock = mock.log(console.log);
  }
  return mock;
}

function _success_mock(req) {
  return _create_mock(
      req,
      200,
      xml_fixture);
}

var xml_fixture = '<?xml version="1.0" encoding="UTF-8"?> \
  <threshold-values type="array"> \
  <threshold_value name="Apdex" begin_time="Fri Dec 12 01:22:00 +0000 2008" end_time="Fri Dec 12 01:27:00 +0000 2008" formatted_metric_value="0.96 [1.0]*" threshold_value="1" metric_value="0.96"/> \
  <threshold_value name="Application Busy" begin_time="Fri Dec 12 01:22:00 +0000 2008" end_time="Fri Dec 12 01:27:00 +0000 2008" formatted_metric_value="3%" threshold_value="1" metric_value="3"/>  \
  <threshold_value name="CPU" begin_time="Fri Dec 12 01:22:00 +0000 2008" end_time="Fri Dec 12 01:27:00 +0000 2008" formatted_metric_value="52.86 %" threshold_value="1" metric_value="52.86"/> \
  <threshold_value name="Memory" begin_time="Fri Dec 12 01:22:00 +0000 2008" end_time="Fri Dec 12 01:27:00 +0000 2008" formatted_metric_value="261.42 MB" threshold_value="1" metric_value="261.42"/> \
  <threshold_value name="Errors" begin_time="Fri Dec 12 01:22:00 +0000 2008" end_time="Fri Dec 12 01:27:00 +0000 2008" formatted_metric_value="0.0 epm" threshold_value="1" metric_value="0.0"/> \
  <threshold_value name="Response Time" begin_time="Fri Dec 12 01:22:00 +0000 2008" end_time="Fri Dec 12 01:27:00 +0000 2008" formatted_metric_value="31 ms" threshold_value="1" metric_value="31"/> \
  <threshold_value name="Throughput" begin_time="Fri Dec 12 01:22:00 +0000 2008" end_time="Fri Dec 12 01:27:00 +0000 2008" formatted_metric_value="14028.6 cpm" threshold_value="1" metric_value="14028.6"/> \
  <threshold_value name="DB" begin_time="Fri Dec 12 01:22:00 +0000 2008" end_time="Fri Dec 12 01:27:00 +0000 2008" formatted_metric_value="46.82 %" threshold_value="1" metric_value="46.82"/> \
  </threshold-values>';
