var middleware = require('web/middleware');
var utils = require('utils');
var mocks = require('../middleware_api_mocks');

/**
 * Runs a single middleware test. Calls assert and test.finish().
 *
 * @param {object} test a Whiskey test object
 * @param {object} assert a Whiskey assert object
 * @param {string} devopsjson the filename of the devopsjson file relative to fixture_path
 * @param {string} name the name of everything: middleware, mock, field in devopsjson that is added by middleware
 * @param {boolean} is_field_expected True if the incoming devopsjson file is expected to generate a field via the middleware
 * @param {boolean} xhr_error if True, call the on_error callback rather than on_success
 * @param {boolean} data_error if True and if on_success is called, provide errorful data
 */
exports.run_test = function(
    test, assert, devops_filename, name,
    is_field_expected, xhr_error, data_error) {

  var devops, mock_maker;
  devops = utils.load_example_devops(devops_filename);
  mock_maker = mocks[name].mock_maker(!xhr_error, !data_error);

  middleware[name](devops, mock_maker)(null, null, function(){});
  if (is_field_expected) {
    if (!xhr_error && !data_error) {
      assert.isDefined(devops[name]);
      assert.isNotNull(devops[name]);
      assert.isNotNull(devops[name].data);
      assert.isNull(devops[name].error);
    } else {
      assert.isDefined(devops[name]);
      assert.isNotNull(devops[name]);
      assert.isNull(devops[name].data);
      assert.isNotNull(devops[name].error);
    }
  } else {
    assert.isUndefined(devops[name]);
  }
  test.finish();
};
