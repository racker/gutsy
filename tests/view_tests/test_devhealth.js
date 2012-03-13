var base = require('./base');
var middleware = require('web/middleware');

var middlewares = [middleware.load_devops,
                   middleware.navbar,
                   middleware.github];

exports.test_example_minimum_only_github = function(test, assert) {
  base.test_view(test, assert, 'devhealth.jade', 'example-minimum.json', middlewares);
};

exports.test_example_simple_only_github = function(test, assert) {
  base.test_view(test, assert, 'devhealth.jade', 'example-simple.json', middlewares);
};

exports.test_example_full_only_github = function(test, assert) {
  base.test_view(test, assert, 'devhealth.jade', 'example-full.json', middlewares);
};
