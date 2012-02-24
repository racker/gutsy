var fs = require('fs');
var path = require('path');
var jade = require('jade');
var assert = require('assert');

exports.run = function() {
  var viewTester = new ViewTester();
  console.log("Running tests: ");

  viewTester.test_view('index.jade', 'example-minimum.json');
  viewTester.test_view('index.jade', 'example-simple.json');
  viewTester.test_view('index.jade', 'example-full.json');

  console.log("Done.");
}

/** The test class
 * @param {Object} options configuration variables.
 * @constructor
 */
var ViewTester = function(options) {
  this._options = options || {};
  this._view_path = path.join(__dirname, '..', '..',  'lib', 'web', 'views');
  this._fixture_path = path.join(__dirname, '..', '..', 'fixtures');
};

/**
 * Runs a view tests
 *
 * @param {string} view the filename of the view relative to this._view_path
 * @param {string} devopsjson the filename of the devopsjson file relative to this._fixture_path
 * @param {function} fn (optional) a callback that takes the rendered html response as an argument
 */
ViewTester.prototype.test_view = function(view, devopsjson, fn) {
  var view_path, context;

  view_path = path.join(this._view_path, view);
  context = path.join(this._fixture_path, devopsjson);
  context = fs.readFileSync(context);
  context = JSON.parse(context);

  jade.renderFile(view_path, context, function(er, html) {
    assert.ifError(er);
    if (fn) {
      fn(html);
    }
    console.log('.')
  });
};
