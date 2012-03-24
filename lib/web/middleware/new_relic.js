var utils = require('../../utils'),
    NewRelicApi = require('newrelicapi');

module.exports = function(req, res, next) {
  // No-op if creds aren't provided
  if (!req.devops.related_apis || !req.devops.related_apis.new_relic) {
    return next();
  }
  req.devops.new_relic = {
    'error': null,
    'data': null
  };
  try{
    var appid = req.devops.related_apis.new_relic.appid;
    var nra = new NewRelicApi({
      apikey: req.devops.related_apis.new_relic.apikey,
      accountId: req.devops.related_apis.new_relic.accountId
    });
    nra.getSummaryMetrics(appid, function(err, res) {
      if (err) {
        req.devops.new_relic.error = err;
      } else {
        req.devops.new_relic.data = res;
      }
      next();
    });
  } catch (e) {
    req.devops.new_relic.error = e;
    next();
  }
};
