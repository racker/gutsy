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

module.exports = utils.create_middleware('version_one', function(req, res, next, payload, api_config) {
  var options = {
    port: api_config.port,
    host: api_config.host,
    path: ['/',
           req.devops.related_apis.version_one.name,
           "/rest-1.v1/Data/Defect?sel=",
           selection,
           "&where=AssetState='0','64';Scope='Scope:",
           req.devops.related_apis.version_one.project,
           "'"].join(""),
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + new Buffer(api_config.auth).toString('base64')
    }
  };
  console.log(options.path);
  utils.request_maker(options,
    function(error, data){
      var byAge = {};
      var now = new Date();
      var defectCreateDate;
      var assets;
      var diff;
      var severity;
      byAge['Less than One'] = defDict();
      byAge['1+'] = defDict();
      byAge['5+'] = defDict();
      byAge['10+'] = defDict();
      byAge['30+'] = defDict();

      if (error){
        payload.error = error;
        return next();
      }
      var etree = et.parse(data);
      if (!_.isEmpty(data.error)){
        payload.error = data.error.code + ": " + data.error.message;
      }
      else {
        assets = etree.getroot().findall('./Asset').map(makeAsset);
        _.each (assets, function(asset) {
          defectCreateDate = new Date(asset.attributes['CreateDate']);
          diff = Math.ceil((now.getTime()-defectCreateDate.getTime())/(1000*60*60*24));
          if (diff <= 1) { type = 'Less than One'; }
          if (diff <= 5 && diff > 1) { type = '1+'; }
          if (diff <= 10 && diff > 5){ type = '5+'; }
          if (diff <= 30 && diff > 10){ type = '10+'; }
          if (diff > 30){ type = '30+'; }
          byAge[type].defects.push(asset);
          byAge[type].total_count += 1;
          severity = asset.attributes['Custom_Severity.Name'];
          if (severity !== "") {
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
      }
      next();
  });
});

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
