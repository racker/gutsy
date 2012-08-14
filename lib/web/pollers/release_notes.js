var ReleaseNotesWorker = require('../release_notes/worker');
var moment = require('moment');

module.exports = {
  name: 'release_notes',
  poll_interval: 5 * 60 * 1000,
  related_apis: ['github', 'version_one', 'dreadnot'],
  priority: 2,
  worker: function _release_notes(poller) {
    var end = new Date();
    var start = moment(end.toISOString()).subtract('months', 1).toDate();

    var worker = new ReleaseNotesWorker(start.valueOf(), end.valueOf(), poller.project);
    worker.work(function (err, results) {
      poller.set_data(err, results);
    });
  }
};
