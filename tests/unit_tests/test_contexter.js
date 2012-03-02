/**
 * Tests that the contexter adds missing optional fields to devops json object
 */
var contexter = require('../../lib/web/contexter');
var utils = require('../../lib/utils');

exports.test_example_minimum = function(test, assert) {
  run_test(test, assert, 'example-minimum.json');
};

exports.test_example_simple = function(test, assert) {
  run_test(test, assert, 'example-simple.json');
};

exports.test_example_full = function(test, assert) {
  run_test(test, assert, 'example-full.json');
};

/**
 * Runs a single test. Calls assert.
 *
 * @param {string} devops_filename the filename of the devopsjson file relative to the fixtures directory
 */
var run_test = function(test, assert, devops_filename) {
  var devops;
  devops = utils.load_example_devops(devops_filename);
  contexter(devops, "test_contexter");
  assert.isDefined(devops.name);
  assert.isDefined(devops.description);
  assert.isDefined(devops.contacts);
  assert.isDefined(devops.links);
  assert.isDefined(devops.environments);
  assert.isDefined(devops.pagerduty);
  assert.isDefined(devops.versionone);
  test.finish();
};
