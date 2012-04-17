var middleware = require('web/middleware');
var utils = require('utils');
var path = require('path');
var async = require('async');

exports.test_example_minimum = function(test, assert) {
  run_test(test, assert, 'example-minimum.json');
};

exports.test_example_simple = function(test, assert) {
  run_test(test, assert, 'example-simple.json');
};

exports.test_example_full = function(test, assert) {
  run_test(test, assert, 'example-full.json');
};

/**
 * Runs a single test. Calls assert.
 *
 * @param {string} devops_filename the filename of the devopsjson file relative to the fixtures directory
 */
var run_test = function(test, assert, devops_filename) {
  var fixtures_path, devops_path, mock_req;

  fixtures_path = path.join('extern', 'devopsjson', 'examples');
  devops_path = path.join(fixtures_path, devops_filename);

  mock_req = {
      params: {
        project: devops_filename
      },
      url: '/p/' + devops_filename,
      devops_directory: fixtures_path
  };

  async.series([function(cb) {
    middleware.load_devops(mock_req, null, cb);
  }, function(cb) {
    middleware.navbar(mock_req, null, cb);
  }], function() {
    assert.isDefined(mock_req.devops.navbar);
    assert.isDefined(mock_req.devops.navbar[utils.capitalize(devops_filename)]);
    assert.equal(mock_req.devops.navbar[utils.capitalize(devops_filename)], '/p/' + devops_filename);
    assert.equal(mock_req.devops.url, '/p/' + devops_filename);
    test.finish();
  });
};
