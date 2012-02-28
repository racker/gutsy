var fs = require('fs');
var path = require('path');var jade = require('jade');
var middleware = require('../../lib/web/middleware');
var utils = require('../../lib/utils');

/** The test class
 * @param {Object} options configuration variables.
 * @constructor
 */
exports.ViewTester = function(test, assert) {
  this._test = test;
  this._assert = assert;
  this._view_path = path.join(__dirname, '..', '..', 'lib', 'web', 'views');
  this._fixture_path = path.join(__dirname, '..', '..', 'fixtures');
};

/**
 * Runs a view tests
 *
 * @param {string} view the filename of the view relative to this._view_path
 * @param {string} devopsjson the filename of the devopsjson file relative to this._fixture_path
 * @param {function} fn (optional) a callback that takes the rendered html response as an argument
 */
exports.ViewTester.prototype.test_view = function(view, devopsjson, middleware_name, fn, xhr_success, data_success) {
  var self = this;
  var view_path, context;

  view_path = path.join(this._view_path, view);
  context = utils.load_example_devops(devopsjson);

  middleware.contexter(context)(null, null, function(){});
  middleware[middleware_name](
      context,
      self._mock_maker(xhr_success, data_success))(null, null, function(){});

  jade.renderFile(view_path, context, function(er, html) {
    self._assert.ifError(er);
    if (fn) {
      fn(html);
    }
  });
  self._test.finish();
};
