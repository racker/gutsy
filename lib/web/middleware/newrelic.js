var utils = require('../../utils'),
    NewRelicApi = require('newrelicapi');

module.exports = function(req, res, next) {
  // No-op if creds aren't provided
  if (!req.devops.related_apis || !req.devops.related_apis.newrelic) {
    return next();
  }

  req.devops.newrelic = {
    'error': null,
    'data': null
  };
  try{
    var appid = req.devops.related_apis.newrelic.appid;
    var nra = new NewRelicApi({
      apikey: req.devops.related_apis.newrelic.apikey,
      accountId: req.devops.related_apis.newrelic.accountId
    });
    nra.getSummaryMetrics(appid, function(err, res) {
      if (err) {
        req.devops.newrelic.error = err;
      } else {
        req.devops.newrelic.data = res;
      }
      next();
    });
  } catch (e) {
    req.devops.newrelic.error = e;
    next();
  }
};
