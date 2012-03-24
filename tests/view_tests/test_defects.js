var base = require('./base');
var middleware = require('web/middleware');

var middlewares =  [middleware.load_devops,
                    middleware.navbar,
                    middleware.version_one];

exports.test_example_full_only_version_one = function(test, assert) {
  base.test_view(test, assert, 'defects.jade', 'example-full.json', middlewares);
};
