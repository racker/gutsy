var utils = require('../../utils').common;
var util = require('util');
var _ = require('underscore');
var url = require('url');
var async = require('async');


module.exports = {
  name: 'ruok',
  poll_interval: 5 * 60 * 1000,
  related_apis: ['ruok'],
  priority: 1,
  worker:  function _ruok(payload) {
    var environments = payload.get_config();
    var pending_requests = {};

    // For each environment, unpack the url to options
    _.each(environments, function(regions, environment) {
      var request = {};
      _.each(regions, function(region_url, region) {
        region_url = url.parse(region_url);
        var options = {
          port: region_url.port,
          host: region_url.hostname,
          path: region_url.path,
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        };
        // Bind the requestmaker to the region key.
        request[region] = function(cb){
          utils.request_maker(options, function(err, res){
            return cb(null, res);
          });
       };
      });
      // Run it, then put all the regions into a bin per environment.
      pending_requests[environment] = async.parallel.bind(async,request);
    });

    // Transform all the responses from JSON to objects.
    //  pending_requests[ request ] :: environments{regions: results} into results
    async.parallel(pending_requests, function(err, request) {
      var results = {};
      results["state"] = "ok";
      results["details"] = {};
      if (err) {payload.set_data(err, null); return;}
      _.each(request, function(regions, environment) {
        var parsed_data;
        _.each(regions, function(response, region) {
          try{
            parsed_data = JSON.parse(response.data);
            if (parsed_data.state != "ok") {
              results["state"] = "error";
            }
            regions[region] = parsed_data;
          } catch (e){
            regions[region] = e;
            console.log(e);
            return;
          }
        });
        results["details"][environment] = regions;
      });
      // console.log(results);
      payload.set_data(null, results);
    });
  }
};

module.exports.poll_interval = 10 * 60 * 1000;
