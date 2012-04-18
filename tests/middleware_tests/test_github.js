var base = require('./base');
var nock = require('nock');
var url = require('url');
var fs = require('fs');
var path = require('path');

var success_data = fs.readFileSync(path.join(__dirname,'fixtures', 'github_success.js'));

exports.test_example_minimum = function(test, assert) {
  base.run_test(test, assert, 'example-minimum.json', 'github', 'github', _success_mock, false);
};

exports.test_example_simple = function(test, assert) {
  base.run_test(test, assert, 'example-simple.json', 'github', 'github', _success_mock, false);
};

exports.test_example_full_success = function(test, assert) {
  base.run_test(test, assert, 'example-full.json', 'github', 'github', _success_mock, true);
};

exports.test_example_full_error = function(test, assert) {
  base.run_test(test, assert, 'example-full.json', 'github', 'github', _error_mock, true, true);
};

function _create_mock(req, status, res) {
  var mock, path, parsed_url;

  if (!req.devops.related_apis || !req.devops.related_apis.github) {
    return null;
  }

  path = [
    "/repos/",
    req.devops.related_apis.github.org,
    "/",
    req.devops.related_apis.github.repo,
    '/pulls'
  ].join("");
  mock = nock(req.devops.related_apis.github.url)
    .get(path+'?state=open&per_page=150&page=1')
    .reply(status, res)
    .get(path+'?state=closed&per_page=150&page=1')
    .reply(status, res);
  return mock;
}

function _success_mock(req) {
  return _create_mock(
      req,
      200,
      success_data);
}

function _error_mock(req) {
  // intentionally provide invalid JSON
  return _create_mock(
      req,
      200,
      "{ will [ this ' parse ?");
}