var settings = require('settings');
var load_devops = require('../../lib/web/load_devops');
var _ = require('underscore');
var utils = require('utils');
var path = require('path');


exports.test_settings_for_consistency = function(test, assert) {
  var external_creds  = settings.external_creds;
  var devopsjson_uris = settings.devopsjson_uris;

  if (!external_creds){
    test.finish();
    return;
  }
  assert.ok(external_creds, "You have external_creds while you have no devopsjson_uris!?  What are they for?");
  for (var key in external_creds){
    assert.isDefined(devopsjson_uris[key], "An external_cred exists in settings for a " +
      "key that is not defined in devopsjson_uris: " + key);
  }
  test.finish();
};

exports.test_settings_against_spec = function(test, assert) {
  var fixtures_path, devops_path, mock_req;
  var test_devops = function(devops){
    return function(){
      report = utils.validate_devops(mock_req.devops);
      assert.ok(report.errors.length <= 0, "A devops file did not validate: " + key);
    };
  };

  load_devops();
  test.finish();
};
