var base = require('./base');
var nock = require('nock');
var url = require('url');

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
    mock = null;
  } else {
    path = ["/api/v2/json/pulls/",
            req.devops.related_apis.github.org,
            "/",
            req.devops.related_apis.github.repo];
    parsed_url = url.parse(req.devops.related_apis.github.url);
    mock = nock(
        [{80: 'http', 443: 'https'}[req.devops.related_apis.pager_duty.port],
         '://',
         parsed_url.host].join(''));
    mock = mock.get(path.join(''));
    mock = mock.reply(status, res);
    // waiting on closed_pull_requests branch
    //path.push('/closed');
    //mock = mock.get(path.join(''));
    //mock = mock.reply(status, res);

    //mock = mock.log(console.log);
  }
  return mock;
};

function _success_mock(req) {
  return _create_mock(
      req,
      200,
      data);
};

function _error_mock(req) {
  // intentionally provide invalid JSON
  return _create_mock(
      req,
      200,
      "{ will [ this ' parse ?");
};

var data = '{ \
  "pulls": { \
    "issue_updated_at": "2012-02-29T21:45:24Z", \
    "gravatar_id": "2222caaaaaa", \
    "position": 1, \
    "number": 1764, \
    "votes": 0, \
    "issue_user": {}, \
    "comments": 0, \
    "body": "Still need to do validation and notification.", \
    "title": "that_thing", \
    "diff_url": "https://github.com/racker/gutsy/pull/1764.diff", \
    "updated_at": "2012-02-29T21:45:24Z", \
    "user": { \
        "login": "ausername" \
    }, \
    "patch_url": "https: //github.com/racker/gutsy/pull/1764.patch", \
    "base": {}, \
    "mergeable": true, \
    "created_at": "2012-02-29T21: 45: 24Z", \
    "issue_created_at": "2012-02-29T21: 45: 24Z", \
    "labels": [], \
    "head": {}, \
    "html_url": "https: //github.com/racker/gutsy/pull/1764", \
    "state": "open" \
}}';
