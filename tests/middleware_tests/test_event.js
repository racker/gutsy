/**
 * Tests that the pagerduty middleware adds fields to the devops json object
 */
var middleware = require('web/middleware');
var utils = require('utils');

exports.atest_example_minimum = function(test, assert) {
  run_test(test, assert, 'example-minimum.json', false);
};

exports.atest_example_simple = function(test, assert) {
  run_test(test, assert, 'example-simple.json', false);
};

exports.test_example_full_apifail = function(test, assert) {
  run_test(test, assert, 'example-full.json', true);
};

var run_test = function(test, assert, devops_filename, is_field_expected) {
  var devops = utils.load_example_devops(devops_filename);
  middleware.event(devops)(null, null, function(){});
  if (is_field_expected) {
    assert.isDefined(devops['new_events']);
  } else {
    assert.isNull(devops['new_events']);
  }
  test.finish();
};
