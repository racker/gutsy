var base = require('./base');
var middleware = require('web/middleware');

exports.test_example_full_only_version_one = function(test, assert) {
  base.test_view(test, assert, 'defects.jade', 'example-full.json');
};
