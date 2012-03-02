/**
 * Tests that the versionone middleware adds the right dataa to devops json object
 */
var base = require('./base');

exports.test_example_minimum = function(test, assert) {
  base.run_test(test, assert, 'example-minimum.json', 'versionone');
};

exports.test_example_simple = function(test, assert) {
  base.run_test(test, assert, 'example-simple.json', 'versionone');
};

exports.test_example_full_apifail = function(test, assert) {
  base.run_test(test, assert, 'example-full.json', 'versionone', true);
};

exports.test_example_full_success = function(test, assert) {
  base.run_test(test, assert, 'example-full.json', 'versionone', true, true);
};

exports.test_example_full_success_with_errors = function(test, assert) {
  base.run_test(test, assert, 'example-full.json', 'versionone', true, false, true);
};
