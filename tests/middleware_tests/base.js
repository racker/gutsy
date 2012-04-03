var middleware = require('web/middleware');
var path = require('path');
var async = require('async');

/**
 * Runs a single API middleware test. Calls assert and test.finish().
 *
 * @param {object} test a Whiskey test object
 * @param {object} assert a Whiskey assert object
 * @param {string} devops_filename the filename of the devopsjson file relative to fixture_path
 * @param {string} middleware_name the name of the middleware
 * @param {string field_name the name of the field in devops json that is inserted by middleware
 * @param {function} create_mock_fn a function that returns a nock object
 * @param {boolean} is_field_expected True if the incoming devopsjson file is expected to generate a field via the middleware
 * @param {boolean} is_error True if the response from the mocked API call is an error
 */
exports.run_test = function(test, assert, devops_filename, middleware_name, field_name, create_mock_fn, is_field_expected, is_error) {
  var fixtures_path, devops_path, mock_req, mock;

  fixtures_path = path.join('extern', 'devopsjson', 'examples');
  devops_path = path.join(fixtures_path, devops_filename);

  mock_req = {
      params: {
        project: devops_filename
      },
      url: '/p/' + devops_filename,
      devops_directory: fixtures_path,
      nocking: true
  };

  async.series([function(cb) {
    middleware.load_devops(mock_req, null, cb);
  }, function(cb) {
    middleware.navbar(mock_req, null, cb);
  }, function(cb) {
    mock = create_mock_fn(mock_req);
    middleware[middleware_name](mock_req, null, cb);
  }], function() {
    var this_devops = mock_req.devops[field_name];
    if (is_field_expected) {
      assert.isDefined(this_devops);
      assert.isNotNull(this_devops,
        "Was null when it shouldn't be: mock_req.devops[field_name]: " +
        field_name);
      if (!is_error) {
        //assert.isNotNull(mock_req.devops[field_name].data);
        assert.isNull(this_devops.error, "there was an error: \n"+
          this_devops.error);
      } else {
        assert.isNull(this_devops.data);
        assert.isNotNull(this_devops.error);
      }
      assert.isNotNull(mock);
      assert.ok(mock.isDone());
    } else {
      if (this_devops !== null){
      }
      assert.isNull(this_devops);
      assert.isNull(mock);
    }
    test.finish();
  });
};
