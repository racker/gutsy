var path = require('path');
var jade = require('jade');
var middleware = require('web/middleware');
var utils = require('utils');

/**
 * Runs a view test. Calls assert and test.finish().
 *
 * @param {object} test a Whiskey test object
 * @param {object} assert a Whiskey assert object
 * @param {string} view the filename of the view relative to view_path
 * @param {string} devopsjson the filename of the devopsjson file relative to fixture_path
 * @param {array} An array of objects containing:
 *    name: {string} name of the middleware
 *    mock_maker: {function} a mock of utils.request_maker (see ./tests/middleware_api_mocks/README.md)
 * @param {boolean} xhr_error if True, call the on_error callback rather than on_success
 * @param {boolean} data_error if True and if on_success is called, provide errorful data
 * @param {function} fn (optional) a callback that takes the rendered html response as an argument
 */
exports.test_view = function(test, assert, view, devopsjson, middlewares, xhr_error, data_error, fn) {
  var view_path, fixture_path, context, i;

  view_path = path.join(__dirname, '..', '..', 'lib', 'web', 'views');
  fixture_path = path.join(__dirname, '..', '..', 'fixtures');

  view_path = path.join(view_path, view);
  context = utils.load_example_devops(devopsjson);

  middleware.contexter(context)(null, null, function(){});
  for (i = 0; i < middlewares.length; i++) {
    middleware[middlewares[i].name](
        context,
        middlewares[i].mock_maker(!xhr_error, !data_error))(null, null, function(){});
  }

  jade.renderFile(view_path, context, function(er, html) {
    assert.ifError(er, er);
    if (fn) {
      fn(html);
    }
  });

  test.finish();
};
