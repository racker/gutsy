var utils = require('../../utils').common;
var db = require('../db');
var init = require('../init');
var crawler = require('../../crawler/app');

module.exports = function _crawl_project(payload) {
  var project_name = payload.name;
  var set_data_wrapper = function (err) {
    payload.set_data(err, {
      crawled_at: new Date()
    });
  };
  crawler.get(payload.project, function(err, new_project){
    if (err !== undefined){
      return set_data_wrapper(err);
    }
    if (new_project.updated_at > payload.get_last_poll_time()) {
      console.log("RELOADING PROJECT");
      return init.load(new_project, set_data_wrapper);
    }
    console.log("NOT RELOADING PROJECT");

    return set_data_wrapper(err);
  });
};

module.exports.poll_interval = 10 * 60 * 1000;
