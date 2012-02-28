var ViewTester = require('./base').ViewTester;

exports.test_example_minimum = function(test, assert) {
  var viewTester = new ViewTester(test, assert);
  viewTester.test_view('defects.jade', 'example-minimum.json', 'versionone');
};

exports.test_example_simple = function(test, assert) {
  var viewTester = new ViewTester(test, assert);
  viewTester.test_view('defects.jade', 'example-simple.json', 'versionone');
};

exports.test_example_full = function(test, assert) {
  var viewTester = new ViewTester(test, assert);
  viewTester.test_view('defects.jade', 'example-full.json', 'versionone');
};

/** Factory for mocking utils.request_maker */
ViewTester.prototype._mock_maker = function(xhr_success, data_success) {
  return function(options, on_success, on_err) {
    if (xhr_success) {
      if (data_success) {
        on_success(xml_fixture);
      } else {
        on_success("{'error': {'message': 'API returned error', 'code': 22}}");
      }
    } else {
      on_err("mocked XHR on_err called");
    }
  };
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
