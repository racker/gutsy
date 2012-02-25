var assert = require('assert');
var middleware = require('../../lib/web/middleware');
var utils = require('../../lib/utils');

/**
 * Runs a single test. Calls assert.
 *
 * @param {string} devops_filename the filename of the devopsjson file relative to the fixtures directory
 */
var test = function(devops_filename) {
  var devops;
  devops = utils.load_devops(devops_filename);
  middleware.contexter(devops)(null, null, function(){});
  assert.ok(devops.name);
  assert.ok(devops.description);
  assert.ok(devops.contacts);
  assert.ok(devops.links);
  assert.ok(devops.environments);
  assert.equal(devops.pagerduty, null);
  console.log('.');
};

/**
 * Tests that the contexter middleware adds missing optional fields to devops json object
 */
exports.run = function() {
  console.log('Running middleware.contexter tests: ');
  test('example-minimum.json');
  test('example-simple.json');
  test('example-full.json');
  console.log('Done.');
};
