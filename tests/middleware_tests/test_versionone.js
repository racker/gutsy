/**
 * Tests that the versionone middleware adds the right dataa to devops json object
 */
var middleware = require('../../lib/web/middleware');
var utils = require('../../lib/utils');

exports.test_example_minimum = function(test, assert) {
  run_test(test, assert, 'example-minimum.json', false);
};

exports.test_example_simple = function(test, assert) {
  run_test(test, assert, 'example-simple.json', false);
};

exports.test_example_full_apifail = function(test, assert) {
  run_test(test, assert, 'example-full.json', true, false);
};

exports.test_example_full_success = function(test, assert) {
  run_test(test, assert, 'example-full.json', true, true);
};

/** Factory for mocking utils.request_maker */
var mock_maker = function(is_success) {
  return function(options, on_success, on_err) {
    if (is_success) {
      on_success(xml_fixture);
    } else {
      on_err("mocked XHR on_err called");
    }
  };
};


/**
 * Runs a single test. Calls assert.
 *
 * @param {string} devops_filename the filename of the devopsjson file relative to the fixtures directory
 */
var run_test = function(test, assert, devops_filename, is_versionone_present, force_success) {
  var devops;
  devops = utils.load_example_devops(devops_filename);
  middleware.versionone(devops, mock_maker(force_success))(null, null, function(){});
  if (is_versionone_present) {
    if (force_success) {
      assert.isDefined(devops.versionone);
      assert.isNotNull(devops.versionone);
      assert.isNotNull(devops.versionone.data);
      assert.isNull(devops.versionone.error);
    } else {
      assert.isDefined(devops.versionone);
      assert.isNotNull(devops.versionone);
      assert.isNull(devops.versionone.data);
      assert.isNotNull(devops.versionone.error);
    }
  } else {
    assert.isUndefined(devops.versionone);
  }
  test.finish();
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
