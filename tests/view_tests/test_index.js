var base = require('./base');
var mocks = require('../middleware_api_mocks');

exports.test_example_minimum_none = function(test, assert) {
  base.test_view(test, assert, 'index.jade', 'example-minimum.json', []);
};

exports.test_example_minimum_pagerduty = function(test, assert) {
  base.test_view(test, assert, 'index.jade', 'example-minimum.json', [mocks.pagerduty]);
};

exports.test_example_minimum_versionone = function(test, assert) {
  base.test_view(test, assert, 'index.jade', 'example-minimum.json', [mocks.versionone]);
};

exports.test_example_minimum_all = function(test, assert) {
  base.test_view(test, assert, 'index.jade', 'example-minimum.json', [mocks.pagerduty, mocks.versionone]);
};

exports.test_example_minimum_all_xhr_err = function(test, assert) {
  base.test_view(test, assert, 'index.jade', 'example-minimum.json', [mocks.pagerduty, mocks.versionone], true);
};

exports.test_example_minimum_all_xhr_data_err = function(test, assert) {
  base.test_view(test, assert, 'index.jade', 'example-minimum.json', [mocks.pagerduty, mocks.versionone], false, true);
};

exports.test_example_simple_none = function(test, assert) {
  base.test_view(test, assert, 'index.jade', 'example-simple.json', []);
};

exports.test_example_simple_pagerduty = function(test, assert) {
  base.test_view(test, assert, 'index.jade', 'example-simple.json', [mocks.pagerduty]);
};

exports.test_example_simple_versionone = function(test, assert) {
  base.test_view(test, assert, 'index.jade', 'example-simple.json', [mocks.versionone]);
};

exports.test_example_simple_all = function(test, assert) {
  base.test_view(test, assert, 'index.jade', 'example-simple.json', [mocks.pagerduty, mocks.versionone]);
};

exports.test_example_full_none = function(test, assert) {
  base.test_view(test, assert, 'index.jade', 'example-full.json', []);
};

exports.test_example_full_pagerduty = function(test, assert) {
  base.test_view(test, assert, 'index.jade', 'example-full.json', [mocks.pagerduty]);
};

exports.test_example_full_versionone = function(test, assert) {
  base.test_view(test, assert, 'index.jade', 'example-full.json', [mocks.versionone]);
};

exports.test_example_full_all = function(test, assert) {
  base.test_view(test, assert, 'index.jade', 'example-full.json', [mocks.pagerduty, mocks.versionone]);
};

exports.test_example_full_all_xhr_err = function(test, assert) {
  base.test_view(test, assert, 'index.jade', 'example-full.json', [mocks.pagerduty, mocks.versionone], true);
};

exports.test_example_full_all_xhr_data_err = function(test, assert) {
  base.test_view(test, assert, 'index.jade', 'example-full.json', [mocks.pagerduty, mocks.versionone], false, true);
};

