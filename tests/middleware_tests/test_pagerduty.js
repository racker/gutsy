/**
 * Tests that the pagerduty middleware adds fields to the devops json object
 */
var base = require('./base');

exports.test_example_minimum = function(test, assert) {
  base.run_test(test, assert, 'example-minimum.json', 'pagerduty');
};

exports.test_example_simple = function(test, assert) {
  base.run_test(test, assert, 'example-simple.json', 'pagerduty');
};

exports.test_example_full_apifail = function(test, assert) {
  base.run_test(test, assert, 'example-full.json', 'pagerduty', true);
};

exports.test_example_full_success = function(test, assert) {
  base.run_test(test, assert, 'example-full.json', 'pagerduty', true, true);
};

exports.test_example_full_success_with_errors = function(test, assert) {
  base.run_test(test, assert, 'example-full.json', 'pagerduty', true, false, true);
};
