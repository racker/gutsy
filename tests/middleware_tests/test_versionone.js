var assert = require('assert');
var middleware = require('../../lib/web/middleware');
var utils = require('../../lib/utils');

/** Factory for mocking utils.request_maker */
var mock_maker = function(is_success) {
  return function(options, on_success, on_err) {
    if (is_success) {
      on_success(JSON.stringify({'success': true}));
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
var test = function(devops_filename, is_versionone_present, force_success) {
  var devops;
  devops = utils.load_example_devops(devops_filename);
  middleware.versionone(devops, mock_maker(force_success))(null, null, function(){});
  if (is_versionone_present) {
    if (force_success) {
      assert.ok(devops.versionone);
      assert.ok(devops.versionone.data);
      assert.equal(devops.versionone.error, null);
    } else {
      assert.ok(devops.versionone);
      assert.equal(devops.versionone.data, null);
      assert.ok(devops.versionone.error);
    }
  } else {
    assert.equal(devops.versionone, null);
  }
  console.log('.');
};

/**
 * Tests that the contexter middleware adds missing optional fields to devops json object
 */
exports.run = function() {
  console.log('Running middleware.versionone tests: ');
  test('example-minimum.json', false);
  test('example-simple.json', false);
  test('example-full.json', true, true);
  test('example-full.json', true, false);
  console.log('Done.');
};
