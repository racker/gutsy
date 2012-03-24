var base = require('./base');
var nock = require('nock');
var fs = require('fs');
var path = require('path');

var xml_fixture = fs.readFileSync(path.join(__dirname,'fixtures', 'version_one.xml'));

exports.test_example_minimum = function(test, assert) {
  base.run_test(test, assert, 'example-minimum.json', 'version_one', 'version_one', _success_mock, false);
};

exports.test_example_simple = function(test, assert) {
  base.run_test(test, assert, 'example-simple.json', 'version_one', 'version_one', _success_mock, false);
};

exports.test_example_full_success = function(test, assert) {
  base.run_test(test, assert, 'example-full.json', 'version_one', 'version_one', _success_mock, true);
};

exports.test_example_full_error = function(test, assert) {
  base.run_test(test, assert, 'example-full.json', 'version_one', 'version_one', _error_mock, true, true);
};


function _create_mock(req, status, res) {
  var mock;

  if (!req.devops.related_apis || !req.devops.related_apis.version_one) {
    mock = null;
  } else {
    mock = nock(
      [{80: 'http', 443: 'https'}[req.devops.related_apis.version_one.port],
       '://',
       req.devops.related_apis.version_one.host].join(''));
    mock = mock.get(
      ['/',
       req.devops.related_apis.version_one.name,
       "/rest-1.v1/Data/Defect?where=Scope='Scope:",
       req.devops.related_apis.version_one.project,
       "'"].join(""));
    mock = mock.reply(status, res);
    //mock = mock.log(console.log);
  }
  return mock;
}

function _success_mock(req) {
  return _create_mock(
    req,
    200,
    xml_fixture);
}

function _error_mock(req) {
  // intentionall provide invalid XML
  return _create_mock(
    req,
    500,
    "{'error': {'message': 'API returned error', 'code': 22}}");
}