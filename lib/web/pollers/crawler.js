var utils = require('../../utils').common;
var db = require('../db');
var init = require('../init');
var crawler = require('../../crawler/app');

module.exports = function _crawl_project(payload, cb) {
  var project_name = payload.get_project_name();
  var set_data_wrapper = function (err) {
    payload.set_data(err, {
      crawled_at: new Date()
    });
  };
  db.get_db().get('SELECT * from projects WHERE NAME = ?', project_name, function(err, project){
    if (err){
      return set_data_wrapper(err);
    }
    crawler.get(project, function(err, new_project){
      if (!project.updated || err !== undefined){
        return set_data_wrapper(err);
      }
      init.load(new_project, function(err){
        set_data_wrapper(err);
      });
    });
  });
};

module.exports.poll_interval = 10 * 60 * 1000;
