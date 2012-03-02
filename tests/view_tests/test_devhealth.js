var base = require('./base');
var mocks = require('../middleware_api_mocks');

exports.test_example_minimum_only_github = function(test, assert) {
  base.test_view(test, assert, 'devhealth.jade', 'example-minimum.json', [mocks.github]);
};

exports.test_example_minimum_with_all = function(test, assert) {
  base.test_view(test, assert, 'devhealth.jade', 'example-minimum.json', [mocks.pagerduty, mocks.versionone, mocks.github]);
};

exports.test_example_simple_only_github = function(test, assert) {
  base.test_view(test, assert, 'devhealth.jade', 'example-simple.json', [mocks.github]);
};

exports.test_example_simple_with_all = function(test, assert) {
  base.test_view(test, assert, 'devhealth.jade', 'example-simple.json', [mocks.pagerduty, mocks.versionone, mocks.github]);
};

exports.test_example_full_only_github = function(test, assert) {
  base.test_view(test, assert, 'devhealth.jade', 'example-full.json', [mocks.github]);
};

exports.test_example_full_with_all = function(test, assert) {
  base.test_view(test, assert, 'devhealth.jade', 'example-full.json', [mocks.pagerduty, mocks.versionone, mocks.github]);
};

exports.test_example_full_with_all_xhr_err = function(test, assert) {
  base.test_view(test, assert, 'devhealth.jade', 'example-full.json', [mocks.pagerduty, mocks.versionone, mocks.github], true);
};

exports.test_example_full_with_all_xhr_data_err = function(test, assert) {
  base.test_view(test, assert, 'devhealth.jade', 'example-full.json', [mocks.pagerduty, mocks.versionone, mocks.github], false, true);
};
