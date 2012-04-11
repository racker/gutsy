var utils = require('../../utils');
var et = require('elementtree');
var _ = require('underscore');


/** Adds versionone field to devops if version_one related api_config is present
 * @param {object} devops devops object
 *
 *
 * http://community.versionone.com/sdk/Documentation/DataAPI.aspx
 * Date Created isn't a default value, so we have to query it manually.
 *
 */


var selection = ["ChangedBy",
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
      byAge['Less than One'] = [];
      byAge['1+'] = [];
      byAge['5+'] = [];
      byAge['10+'] = [];
      byAge['30+'] = [];
      var now = new Date();
      var defectCreateDate;
      var assets;
      var diff;
      
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
          if (diff <= 1) {byAge['Less than One'].push(asset);}
          if (diff <= 5 && diff > 1) {byAge['1+'].push(asset);}
          if (diff <= 10 && diff > 5){byAge['5+'].push(asset);}
          if (diff > 10){byAge['10+'].push(asset);}
          if (diff > 30){byAge['30+'].push(asset);}
        });
        payload.data = {
          'total': etree.getroot().attrib.total,
          'byAge': byAge
        };
      }
      next();
  });
});

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
