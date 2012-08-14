var utils = require('../../utils').common;
var NewRelicApi = require('newrelicapi');

module.exports = {
  name: 'new_relic',
  poll_interval: 5 * 60 * 1000,
  related_apis: ['new_relic'],
  priority: 1,
  worker: function _new_relic(payload) {
    var api_config = payload.get_config();
    var appid = api_config.appid;
    var nra = new NewRelicApi({
      apikey: api_config.apikey,
      accountId: api_config.accountId
    });
    nra.getSummaryMetrics(appid, function(err, data) {
      payload.set_data(err, data);
    });
  }
};