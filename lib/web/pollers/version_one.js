/** Adds versionone field to devops if version_one related self.api_config is present
 * @param {object} devops devops object
 *
 * The MetaAPI which includes all our custom fields is available here:
 * https://www15.v1host.com/RACKSPCE/meta.v1/?xsl=api.xsl
 *
 * http://community.versionone.com/sdk/Documentation/DataAPI.aspx
 * Date Created isn't a default value, so we have to query it manually.
 *
 */

var _ = require('underscore');

var utils = require('../../utils');
var iface = require('./interface');

var selection = ["Custom_Severity.Name",
                "ChangedBy",
                "CreateDate",
                "Owners",
                "SecurityScope",
                "AssetState",
                "Owners",
                "AssetType",
                "Status",
                "Number",
                "Order",
                "Description",
                "Scope.Name",
                "Name",
                "ResolutionReason",
                "Timebox",
                "Resolution",
                "Scope",
                "Priority"];

/**
 *
 * @returns A default dictionary for defects aggregation
 */
function defDict() {
  return {
    total_count: 0,
    sev_count: {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      '?': 0
    },
    defects: []
  };
}

// Poll every 10 minutes
module.exports.poll_interval = 10 * 60 * 1000;

module.exports = iface.make_poller({
  __poll: function(){
    var self = this;
    var options = {
      port: self.api_config.port,
      host: self.api_config.host,
      path: ['/',
             self.api_config.name,
             "/rest-1.v1/Data/Defect?sel=",
             selection,
             "&where=AssetState='0','64';Scope='Scope:",
             self.api_config.project,
             "'"].join(""),
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + new Buffer(self.api_config.auth).toString('base64')
      }
    };

    utils.request_maker(options,
      function(error, data){
        var byAge = {};
        var now = new Date();
        var defectCreateDate;
        var assets;
        var diff;
        var severity;
        var type;
        var age0 = 'defects Today';
        var age1 = 'defects 1 - 5 days old';
        var age2 = 'defects 5 - 10 days old';
        var age3 = 'defects 10 - 30 days old';
        var age4 = 'defects more than 30 days old';
        byAge[age0] = defDict();
        byAge[age1] = defDict();
        byAge[age2] = defDict();
        byAge[age3] = defDict();
        byAge[age4] = defDict();

        if (error){
          self.payload.error = error;
          return;
        }

        utils.parse_v1(data.data, function(err, assets){
          if (err){
            self.payload.error = err;
            return;
          }
          _.each (assets, function(asset) {
            defectCreateDate = new Date(asset.attributes['CreateDate']);
            diff = Math.ceil((now.getTime()-defectCreateDate.getTime())/(1000*60*60*24));
            if (diff <= 1) { type = age0; }
            else if (diff <= 5) { type = age1; }
            else if (diff <= 10){ type = age2; }
            else if (diff <= 30){ type = age3; }
            else if (diff > 30){ type = age4; }
            else { type = age0; }
            byAge[type].defects.push(asset);
            byAge[type].total_count += 1;
            severity = asset.attributes['Custom_Severity.Name'];
            if (severity && severity !== "") {
              severity = severity[0];
            } else {
              severity = '?';
            }
            asset.severity = severity;
            byAge[type].sev_count[severity] += 1;
          });

          self.payload.data = {
            'total': assets.length,
            'byAge': byAge
          };
        });
    });
  }
});
