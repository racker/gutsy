var fs = require('fs');
var path = require('path');
var assert = require('assert');
var middleware = require('../../lib/web/middleware');

/**
 * Takes a relative devops filename and returns the parsed content
 *
 * @param {string} devops_filename the filename of the devopsjson file relative to the fixtures directory
 * @return {Object} parsed content of JSON file
 */
var load_devops = function(devops_filename) {
  var devops;
  devops = path.join(__dirname, '..', '..', 'fixtures', devops_filename);
  devops = path.join(this._fixture_path, devops);
  devops = fs.readFileSync(devops);
  devops = JSON.parse(devops);
  return devops
}

/**
 * Runs a single test. Calls assert.
 *
 * @param {string} devops_filename the filename of the devopsjson file relative to the fixtures directory
 */
var test_devops = function(devops_filename) {
  var devops;
  devops = load_devops(devops_filename);
  middleware.contexter(devops)(null, null, function(){});
  assert.ok(devops.name);
  assert.ok(devops.description);
  assert.ok(devops.contacts);
  assert.ok(devops.links);
  assert.ok(devops.environments);
  console.log('.');
}

/**
 * Tests that the contexter middleware adds missing optional fields to devops json object
 */
exports.run = function() {
  console.log('Running middleware.contexter tests: ');
  test_devops('example-minimum.json');
  test_devops('example-simple.json');
  test_devops('example-full.json');
  console.log('Done.');
}
