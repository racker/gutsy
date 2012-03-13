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
  var fixtures_path, devops_path, mock_req;

  fixtures_path = path.join('extern', 'devopsjson', 'examples');
  devops_path = path.join(fixtures_path, devops_filename);

  var mock_req = {
      params: {
        project: devops_filename
      },
      devops_directory: fixtures_path
  };

  middleware.load_devops(mock_req, null, function(){
    assert.isDefined(mock_req.devops);
    assert.isDefined(mock_req.devops.name);
    assert.isDefined(mock_req.devops.description);
    assert.isDefined(mock_req.devops.contacts);
    assert.isDefined(mock_req.devops.tags);
    assert.isDefined(mock_req.devops.links);
    assert.isDefined(mock_req.devops.environments);
    assert.isDefined(mock_req.devops.metadata);
    assert.isDefined(mock_req.devops.related_apis);
    assert.isDefined(mock_req.devops.dependent_services);
    assert.isDefined(mock_req.devops.events);
    assert.isDefined(mock_req.devops.kpi_spec);
    assert.isNull(mock_req.devops.pagerduty);
    assert.isNull(mock_req.devops.versionone);
    assert.isNull(mock_req.devops.github);
    test.finish();
  });
};
