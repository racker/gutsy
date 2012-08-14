var moment = require('moment');

var db = require('../db');

module.exports = {
  name: 'prune_events',
  poll_interval: 1000 * 60 * 60 * 24,
  related_apis: [],
  priority: 0,
  worker: function _prune_events(poller) {
    var project_name = poller.get_project_name();
    var threshold = moment().subtract('months', 3).toDate().valueOf();
    // TODO: run vacuum
    db.get_db().run("DELETE FROM events WHERE project=? AND time<?;", project_name, threshold, function(err, results){
      poller.set_data(err, results);
    });
  }
};
