var utils = require('../../utils');
var et = require('elementtree');
var _ = require('underscore');


/** Adds versionone field to devops if version_one related api_config is present
 * @param {object} devops devops object
 *
 * The MetaAPI which includes all our custom fields is available here:
 * https://www15.v1host.com/RACKSPCE/meta.v1/?xsl=api.xsl
 *
 * http://community.versionone.com/sdk/Documentation/DataAPI.aspx
 * Date Created isn't a default value, so we have to query it manually.
 *
 */


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

module.exports = function(payload) {
  var api_config = payload.config;
  var options = {
    port: api_config.port,
    host: api_config.host,
    path: ['/',
           api_config.name,
           "/rest-1.v1/Data/Defect?sel=",
           selection,
           "&where=AssetState='0','64';Scope='Scope:",
           api_config.project,
           "'"].join(""),
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + new Buffer(api_config.auth).toString('base64')
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
        payload.error = error;
        return;
      }
      var etree = et.parse(data.data);
      if (!_.isEmpty(data.error)){
        payload.error = data.error.code + ": " + data.error.message;
        return;
      }

      assets = etree.getroot().findall('./Asset').map(makeAsset);
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
      payload.data = {
        'total': etree.getroot().attrib.total,
        'byAge': byAge
      };
  });
};

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

/** an asset is a generic v1 object */
function Asset() {
  this.href = null;
  this.id = null;
  this.idref = null;
  this.attributes = {};
  this.relations = {};
}

/** an attribute is a (name, text) tuple. */
function makeAttribute(element) {
  return { name: element.attrib.name, text: element.text };
}

/** a relation is a (name, asset) tuple where the asset is optional. */
function makeRelation(element) {
  var asset = element.findall('./Asset');
  // this works as long as the assumption that each relation has one or zero assets.
  asset = asset.length > 0 ? makeAsset(asset[0]) : undefined;
  return { name: element.attrib.name, asset: asset };
}

/**
 * create an asset from some xml.
 * @param {ElementTree} element must be a single Asset.
 */
function makeAsset(element) {
  if (element.tag !== 'Asset') {
    return null;
  }
  var ass = new Asset();
  ass.href = element.attrib.href;
  ass.id = element.attrib.id;
  ass.idref = element.attrib.idref;
  ass.attributes = element.findall('./Attribute').map(makeAttribute).reduce(function(hash, named) {
    hash[named.name] = named.text;
    return hash;
  }, {});
  ass.relations = element.findall('./Relation').map(makeRelation).reduce(function(hash, named) {
    hash[named.name] = named.asset;
    return hash;
  }, {});
  return ass;
}
