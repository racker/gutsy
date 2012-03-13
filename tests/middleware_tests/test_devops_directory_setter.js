var middleware = require('web/middleware');
var path = require('path');

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
  var fixtures_path = path.join('extern', 'devopsjson', 'examples');

  var mock_req = {
      params: {
        project: devops_filename
      }
  };

  middleware.devops_directory_setter(fixtures_path)(mock_req, null, function(){
    assert.isDefined(mock_req.devops_directory);
    assert.equal(mock_req.devops_directory, fixtures_path);
    test.finish();
  });
};
