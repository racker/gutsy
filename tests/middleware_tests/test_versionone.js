var base = require('./base');
var nock = require('nock');

exports.test_example_minimum = function(test, assert) {
  base.run_test(test, assert, 'example-minimum.json', 'versionone', 'versionone', _success_mock, false);
};

exports.test_example_simple = function(test, assert) {
  base.run_test(test, assert, 'example-simple.json', 'versionone', 'versionone', _success_mock, false);
};

exports.test_example_full_success = function(test, assert) {
  base.run_test(test, assert, 'example-full.json', 'versionone', 'versionone', _success_mock, true);
};

exports.test_example_full_error = function(test, assert) {
  base.run_test(test, assert, 'example-full.json', 'versionone', 'versionone', _error_mock, true, true);
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
         //"/rest-1.v1/Data/Defect?where=Scope='Scope:",
         //req.devops.related_apis.version_one.project,
         //"',Status!='Done'"].join(""),
         "/rest-1.v1/Data/Defect?where=Status.Name!='Closed'&findin=Scope.Name&find='",
         req.devops.related_apis.version_one.project,
         "'"].join(""));
    mock = mock.reply(status, res);
    //mock = mock.log(console.log);
  }
  return mock;
};

function _success_mock(req) {
  return _create_mock(
      req,
      200,
      xml_fixture);
};

function _error_mock(req) {
  // intentionall provide invalid XML
  return _create_mock(
      req,
      500,
      "{'error': {'message': 'API returned error', 'code': 22}}");
};

var xml_fixture = '<Assets total="10" pageSize="2147483647" pageStart="0"> \
  <Asset href="/VersionOne/rest-1.v1/Data/Story/1021" id="Story:1021"> \
    <Attribute name="Name">Logon</Attribute> \
    <Relation name="Status"> \
      <Asset href="/VersionOne/rest-1.v1/Data/StoryStatus/137" idref="StoryStatus:137" /> \
    </Relation> \
    <Relation name="Timebox"> \
      <Asset href="/VersionOne/rest-1.v1/Data/Timebox/1022" idref="Timebox:1022" /> \
    </Relation> \
    <Attribute name="DetailEstimate" /> \
    <Attribute name="AssetType">Story</Attribute> \
    <Attribute name="AssetState">128</Attribute> \
    <Attribute name="Number">S-01001</Attribute> \
    <Attribute name="ToDo" /> \
    <Attribute name="Order">32</Attribute> \
    <Relation name="Parent"> \
      <Asset href="/VersionOne/rest-1.v1/Data/Theme/1015" idref="Theme:1015" /> \
    </Relation> \
    <Attribute name="Description" /> \
    <Attribute name="Estimate">2</Attribute> \
    <Relation name="Priority"> \
      <Asset href="/VersionOne/rest-1.v1/Data/WorkitemPriority/140" idref="WorkitemPriority:140" /> \
    </Relation> \
    <Relation name="Scope"> \
      <Asset href="/VersionOne/rest-1.v1/Data/Scope/1010" idref="Scope:1010" /> \
    </Relation> \
    <Relation name="Owners"> \
      <Asset href="/VersionOne/rest-1.v1/Data/Member/1000" idref="Member:1000" /> \
    </Relation> \
  </Asset> \
  <!-- Additional Asset Nodes --> \
</Assets>';
