var base = require('./base');
var mocks = require('../middleware_api_mocks');

exports.test_example_minimum_only_versionone = function(test, assert) {
  base.test_view(test, assert, 'defects.jade', 'example-minimum.json', [mocks.versionone]);
};

exports.test_example_minimum_with_pagerduty = function(test, assert) {
  base.test_view(test, assert, 'defects.jade', 'example-minimum.json', [mocks.pagerduty, mocks.versionone]);
};

exports.test_example_simple_only_versionone = function(test, assert) {
  base.test_view(test, assert, 'defects.jade', 'example-simple.json', [mocks.versionone]);
};

exports.test_example_simple_with_pagerduty = function(test, assert) {
  base.test_view(test, assert, 'defects.jade', 'example-simple.json', [mocks.pagerduty, mocks.versionone]);
};

exports.test_example_full_only_versionone = function(test, assert) {
  base.test_view(test, assert, 'defects.jade', 'example-full.json', [mocks.versionone]);
};

exports.test_example_full_with_pagerduty = function(test, assert) {
  base.test_view(test, assert, 'defects.jade', 'example-full.json', [mocks.pagerduty, mocks.versionone]);
};

exports.test_example_full_with_pagerduty_xhr_err = function(test, assert) {
  base.test_view(test, assert, 'defects.jade', 'example-full.json', [mocks.pagerduty, mocks.versionone], true);
};

exports.test_example_full_with_pagerduty_xhr_data_err = function(test, assert) {
  base.test_view(test, assert, 'defects.jade', 'example-full.json', [mocks.pagerduty, mocks.versionone], false, true);
};
