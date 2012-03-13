var base = require('./base');

exports.test_example_minimum = function(test, assert) {
  base.run_test(test, assert, 'example-minimum.json', 'newrelic', 'newrelic', false);
};

exports.test_example_simple = function(test, assert) {
  base.run_test(test, assert, 'example-simple.json', 'newrelic', 'newrelic', false);
};

// This test fails because we don't mock the New Relic API, and the API key in examples is made up.
exports.test_example_full___expected_timeout = function(test, assert) {
  base.run_test(test, assert, 'example-full.json', 'newrelic', 'newrelic', true, true);
};
