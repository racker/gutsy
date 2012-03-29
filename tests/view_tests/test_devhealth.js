var base = require('./base');
var middleware = require('web/middleware');

var middlewares = [middleware.github];

exports.test_example_full_only_github = function(test, assert) {
  base.test_view(test, assert, 'devhealth.jade', 'example-full.json', middlewares);
};
