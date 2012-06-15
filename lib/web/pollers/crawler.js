var url = require('url');

var utils = require('../../utils').common;
var db = require('../db');
var init = require('../init');

module.exports = function _crawl_project(payload) {
  var project = payload.project;
  var options, parsed_url;

  parsed_url = url.parse(project.url);
  options = {
    host: parsed_url.host,
    port: 443,
    path: parsed_url.path,
    timeout: 11 * 1000,
    method: 'GET',
    headers: {
        'Content-Type': 'application/json'
    }
  };

  if (parsed_url.port) {
    options.port = parsed_url.port;
  }
  else if (parsed_url.protocol) {
    options.port = {'https:': 443, 'http:': 80}[parsed_url.protocol] || options.port;
  }

  utils.request_maker(options, function (err, results) {
    if (err) {
      return payload.set_data(err, results);
    }
    if (results && results.data) {
      return project.update(null, null, null, results.data, null, null)
    }
    return payload.set_data("No data when crawling", results);
  });
};

module.exports.poll_interval = 10 * 60 * 1000;
