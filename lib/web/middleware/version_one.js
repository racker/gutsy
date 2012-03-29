var utils = require('../../utils');
var et = require('elementtree');
var _ = require('underscore');


/** Adds versionone field to devops if version_one related api_config is present
 * @param {object} devops devops object
 */
module.exports = utils.create_middleware('version_one', function(req, res, next, payload, api_config) {
  var options = {
    port: api_config.port,
    host: api_config.host,
    path: ['/',
           req.devops.related_apis.version_one.name,
           //"/rest-1.v1/Data/Defect?where=Status.Name='Closed'&findin=Scope.Name&find='",
           "/rest-1.v1/Data/Defect?where=Scope='Scope:",
           req.devops.related_apis.version_one.project,
           "'"].join(""),
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + new Buffer(api_config.auth).toString('base64')
    }
  };
  utils.request_maker(options,
    function(error, data){
      if (error){
        payload.error = error;
        return next();
      }
      var etree = et.parse(data);
      if (!_.isEmpty(data.error)){
        payload.error = data.error.code + ": " + data.error.message;
      } else{

        payload.data = {
          'total': etree.getroot().attrib.total,
          'defects': etree.getroot().findall('./Asset').map(makeAsset)
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
