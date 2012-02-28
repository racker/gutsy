var fs = require('fs');
var path = require('path');
var http = require('http');

/**
 * Takes a relative or absolute devops filename and returns the parsed content
 *
 * @param {string} devops_filename the filename of the devopsjson file relative to the fixtures directory
 * @return {Object} parsed content of JSON file
 */
exports.load_devops = function(devops_path) {
  var devops;
  devops = fs.readFileSync(devops_path);
  devops = JSON.parse(devops);
  return devops;
};

/**
 * Loads an example devopsjson file from devopsjson/examples
 *
 * @param {string} devops_filename the filename of the devopsjson file relative to extern/devopsjson/examples
 * @return {Object} parsed content of JSON file
 */
exports.load_example_devops = function(devops_path) {
  devops_path = path.join(__dirname, '..', 'extern', 'devopsjson', 'examples', devops_path);
  return exports.load_devops(devops_path);
};


/** A convenience function for making requests without having to build up response body data.
 * Also useful for mocking the making of requests in tests
 * @param {Object} options an options dict such as http.request would use
 * @param {fn} on_success callback that takes the complete response body data as a parameter
 * @param {fn} on_error callback that takes an Exception as a parameter
 */
exports.request_maker = function(options, on_success, on_err) {
  req = http.get(options, function(res) {
    var data = '';
    res.setEncoding('utf8');
    res.on('data', function(d) {
      data += d;
    });
    res.on('end', function() {
      on_success(data);
    });
  }).on('error', function(e) {
    on_error(e);
  });
};
