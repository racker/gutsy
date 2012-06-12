var ReleaseNotesWorker = require('../release_notes/worker');
var moment = require('moment');

module.exports = function _release_notes(payload) {
  var end = new Date();
  var start = moment(end.toISOString()).subtract('months', 1).toDate();

  var worker = new ReleaseNotesWorker(start.valueOf(), end.valueOf(), payload);
  worker.work(function (err, results) {
    payload.set_data(err, results);
  });
};

module.exports.poll_interval = 5 * 60 * 1000;
