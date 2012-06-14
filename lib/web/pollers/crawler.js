var utils = require('../../utils').common;


module.exports = function _crawl_project(payload, cb) {
  var project_name = payload.get_project_name();
  db.get_db().get('SELECT * from PROJECT WHERE NAME = ?', project_name, function(err, project){
    if (err){
      return payload.set_data(err);
    }
    crawler.get(project, function(err, new_project){
      if (!project.updated){
        return payload.set_data(err);
      }
      init.load(new_project, function(err){
        payload.set_data(err);
      });
    });
  });

};

module.exports.poll_interval = 10 * 60 * 1000;