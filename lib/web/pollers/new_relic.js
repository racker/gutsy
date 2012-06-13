var utils = require('../../utils').common;
var NewRelicApi = require('newrelicapi');

module.exports = function _new_relic(payload, cb) {
  var api_config = payload.get_config();
  var appid = api_config.appid;
  var nra = new NewRelicApi({
    apikey: api_config.apikey,
    accountId: api_config.accountId
  });
  nra.getSummaryMetrics(appid, function(err, data) {
    payload.set_data(err, data);
  });
};

module.exports.poll_interval = 10 * 60 * 1000;
