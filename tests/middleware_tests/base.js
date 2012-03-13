var middleware = require('web/middleware');
var path = require('path');
var async = require('async');

/**
 * Runs a single middleware test. Calls assert and test.finish().
 *
 * @param {object} test a Whiskey test object
 * @param {object} assert a Whiskey assert object
 * @param {string} devopsjson the filename of the devopsjson file relative to fixture_path
 * @param {string} name the name of everything: middleware, mock, field in devopsjson that is added by middleware
 * @param {boolean} is_field_expected True if the incoming devopsjson file is expected to generate a field via the middleware
 */
exports.run_test = function(test, assert, devops_filename, middleware_name, field_name, is_field_expected) {
  var fixtures_path, devops_path, mock_req;

  fixtures_path = path.join('extern', 'devopsjson', 'examples');
  devops_path = path.join(fixtures_path, devops_filename);

  var mock_req = {
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
  }, function(cb) {
    middleware[middleware_name](mock_req, null, cb);
  }], function() {
    if (is_field_expected) {
      assert.isDefined(mock_req.devops[field_name]);
      assert.isNotNull(mock_req.devops[field_name]);
      assert.isNotNull(mock_req.devops[field_name].data);
      assert.isNull(mock_req.devops[field_name].error);
    } else {
      assert.isNull(mock_req.devops[field_name]);
    }
    test.finish();
  });
};
