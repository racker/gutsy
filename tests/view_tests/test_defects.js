var base = require('./base');
var middleware = require('web/middleware');

var middlewares =  [middleware.load_devops,
                    middleware.navbar,
                    middleware.versionone];

exports.test_example_minimum_only_versionone = function(test, assert) {
  base.test_view(test, assert, 'defects.jade', 'example-minimum.json', middlewares);
};

exports.test_example_simple_only_versionone = function(test, assert) {
  base.test_view(test, assert, 'defects.jade', 'example-simple.json', middlewares);
};

exports.test_example_full_only_versionone = function(test, assert) {
  base.test_view(test, assert, 'defects.jade', 'example-full.json', middlewares);
};
