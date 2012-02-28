/**
 * Tests that the pagerduty middleware adds fields to the devops json object
 */
var middleware = require('../../lib/web/middleware');
var utils = require('../../lib/utils');

exports.test_example_minimum = function(test, assert) {
  run_test(test, assert, 'example-minimum.json', false);
};

exports.test_example_simple = function(test, assert) {
  run_test(test, assert, 'example-simple.json', false);
};

exports.test_example_full_apifail = function(test, assert) {
  run_test(test, assert, 'example-full.json', true, false);
};

exports.test_example_full_success = function(test, assert) {
  run_test(test, assert, 'example-full.json', true, true);
};

/** Factory for mocking utils.request_maker */
var mock_maker = function(is_success) {
  return function(options, on_success, on_err) {
    if (is_success) {
      on_success(JSON.stringify({'success': true}));
    } else {
      on_err("mocked XHR on_err called");
    }
  };
};


/**
 * Runs a single test. Calls assert.
 *
 * @param {string} devops_filename the filename of the devopsjson file relative to the fixtures directory
 */
var run_test = function(test, assert, devops_filename, is_pagerduty_present, force_success) {
  var devops;
  devops = utils.load_example_devops(devops_filename);
  middleware.pagerduty(devops, mock_maker(force_success))(null, null, function(){});
  if (is_pagerduty_present) {
    if (force_success) {
      assert.isDefined(devops.pagerduty);
      assert.isNotNull(devops.pagerduty);
      assert.isNotNull(devops.pagerduty.data);
      assert.isNull(devops.pagerduty.error);
    } else {
      assert.isDefined(devops.pagerduty);
      assert.isNotNull(devops.pagerduty);
      assert.isNull(devops.pagerduty.data);
      assert.isNotNull(devops.pagerduty.error);
    }
  } else {
    assert.isUndefined(devops.pagerduty);
  }
  test.finish();
};
