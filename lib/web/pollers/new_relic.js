var utils = require('../../utils');
var iface = require('./interface');

var NewRelicApi = require('newrelicapi');

// Poll every 60 minutes
module.exports.poll_interval = 60 * 60 * 1000;

module.exports = iface.make_poller({
  __poll: function(){
    var self = this;
    var appid = self.api_config.appid;
    var nra = new NewRelicApi({
      apikey: self.api_config.apikey,
      accountId: self.api_config.accountId
    });
    nra.getSummaryMetrics(appid, function(err, data) {
      if (err) {
        self.payload.error = err;
      } else {
        self.payload.data = data;
      }
    });
  }
});
