/**
 * Tests that the github middleware adds fields to the devops json object
 */
var base = require('./base');

exports.atest_example_minimum = function(test, assert) {
  base.run_test(test, assert, 'example-minimum.json', 'github');
};

exports.atest_example_simple = function(test, assert) {
  base.run_test(test, assert, 'example-simple.json', 'github');
};

exports.test_example_full_apifail = function(test, assert) {
  base.run_test(test, assert, 'example-full.json', 'github', true);
};

exports.atest_example_full_success = function(test, assert) {
  base.run_test(test, assert, 'example-full.json', 'github', true, true);
};

exports.atest_example_full_success_with_errors = function(test, assert) {
  base.run_test(test, assert, 'example-full.json', 'github', true, false, true);
};
