var base = require('./base');

exports.test_example_minimum = function(test, assert) {
  base.run_test(test, assert, 'example-minimum.json', 'pagerduty', 'pagerduty', false);
};

exports.test_example_simple = function(test, assert) {
  base.run_test(test, assert, 'example-simple.json', 'pagerduty', 'pagerduty', false);
};

exports.test_example_full__expected_timeout = function(test, assert){
  base.run_test(test, assert, 'example-full.json', 'pagerduty', 'pagerduty', true);
};
