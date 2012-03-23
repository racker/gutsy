var http = require('http'),
    https = require('https'),
    fs = require('fs'),
    path = require('path'),
    async = require('async'),
    url = require('url'),
    utils = require('../utils'),
    settings = require('../../settings');

var generate_worker = function(name, devopsjson_url) {
  var options, parsed_url, filename, munged_devopsjson_url;
  parsed_url = url.parse(devopsjson_url);
  options = {
      host: parsed_url.host,
      port: {'https:': 443, 'http:': 80}[parsed_url.protocol],
      path: parsed_url.path,
      method: 'GET',
      headers: {
          'Content-Type': 'application/json'
      }
  };
  filename = path.join(settings.saved_crawls_path, name);
  return function(callback) {
    utils.request_maker(
        options,
        function(data) {
          fs.writeFile(filename, data, function (err) {
            if (err) {
              console.log("Error writing file ", filename, err);
            } else {
              console.log("Wrote file: ", filename);
            }
            callback(null, 'done');
          });
        }, function(er) {
          console.log("Error writing file ", options.path, filename, er);
          callback(er, null);
        });
  };
};

// retrieve devops.json and save it to a file
exports.run = function() {
  var workers, key;
  workers = [];
  for (key in settings.devopsjson_uris) {
    workers.push(generate_worker(key, settings.devopsjson_uris[key]));
  }
  async.parallel(workers);
};
