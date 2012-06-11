var ReleaseNotesWorker = require('../release_notes/worker');
var moment = require('moment');

module.exports = function _release_notes(payload) {
  var api_config = payload.get_config();
  var end = new Date();
  var start = moment(end).subtract('months', 1).toDate();

  var worker = new ReleaseNotesWorker(api_config, start, end);
  worker.work(function (err, results) {
    payload.set_data(err, results);
  });
};

module.exports.poll_interval = 5 * 60 * 1000;
