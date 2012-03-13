var base = require('./base');
var middleware = require('web/middleware');

var middlewares =  [middleware.load_devops,
                    middleware.navbar,
                    middleware.pagerduty,
                    middleware.github,
                    middleware.versionone];

exports.test_example_minimum_none = function(test, assert) {
  base.test_view(test, assert, 'index.jade', 'example-minimum.json', middlewares);
};

exports.test_example_simple_none = function(test, assert) {
  base.test_view(test, assert, 'index.jade', 'example-simple.json', middlewares);
};

exports.test_example_full_none = function(test, assert) {
  base.test_view(test, assert, 'index.jade', 'example-full.json', middlewares);
};
