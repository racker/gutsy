var base = require('./base');
var nock = require('nock');
var url = require('url');
var fs = require('fs');
var path = require('path');
var _ = require('underscore');

exports.test_example_minimum = function(test, assert) {
  base.run_test(test, assert, 'example-minimum.json', 'dreadnot', 'dreadnot', _success_mock, false);
};

exports.test_example_simple = function(test, assert) {
  base.run_test(test, assert, 'example-simple.json', 'dreadnot', 'dreadnot', _success_mock, false);
};

exports.test_example_full_success = function(test, assert) {
  base.run_test(test, assert, 'example-full.json', 'dreadnot', 'dreadnot', _success_mock, true);
};

exports.test_example_full_error = function(test, assert) {
  base.run_test(test, assert, 'example-full.json', 'dreadnot', 'dreadnot', _error_mock, true, true);
};

function _create_mock(req, status, res) {
  var mock, path_1, path_2, parsed_url, stack_name, region_name;

  if (!req.devops.related_apis || !req.devops.related_apis.dreadnot) {
    return null;
  }
  stack_name = _.keys(req.devops.related_apis.dreadnot.stacks[0])[0];
  region_name = _.values(req.devops.related_apis.dreadnot.stacks[0])[0];
  path_1 = "/api/1.0/stacks/" + stack_name;
  path_2 =  "/api/1.0/stacks/" + stack_name + '/regions/' + region_name + '/deployments';
  mock = nock('https://'+req.devops.related_apis.dreadnot.url);
  mock = mock.get(path_1).reply(status, res[0]).get(path_2).reply(status, res[1]);
  return mock;
}

function _success_mock(req) {
  return _create_mock(
      req,
      200,
      [{
        "name": "reach",
        "github_href": "https://github.com/racker/reach",
        "latest_revision": "f3d1657c2c75871eb6e0b24e733df8bd30663910"
      },
      [
        {
          "name": "354",
          "stackName": "reach",
          "region": "ord1",
          "environment": "ord1_prod",
          "from_revision": "5d7610834eae21f83659a4364671836f49ec42d7",
          "to_revision": "f3941818996d9d7f2446d525a9b6c72165d560c6",
          "time": 1333041974404,
          "user": "morgabra",
          "finished": true,
          "success": true
        },
        {
          "name": "353",
          "stackName": "reach",
          "region": "ord1",
          "environment": "ord1_prod",
          "from_revision": "92f12c873c5e31de24968ba88cc372266bf1e33b",
          "to_revision": "5d7610834eae21f83659a4364671836f49ec42d7",
          "time": 1333035162979,
          "user": "bradgignac",
          "finished": true,
          "success": true
        }
      ]
    ]);
}

function _error_mock(req) {
  // intentionally provide invalid JSON
  return _create_mock(
      req,
      200,
      ["{ will [ this ' parse ?", 'af93(D']);
}