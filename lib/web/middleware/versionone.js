var utils = require('../../utils');
var et = require('elementtree');

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

/** Adds versionone field to devops if version_one related api is present
 * @param {object} devops devops object
 */
module.exports = function(devops, request_maker) {
  // No-op if VersionOne creds aren't provided
  if (!devops.related_apis || !devops.related_apis.version_one) {
    return function(req, res, next) {
      next();
    };
  }

  // If a request maker isn't provided, use the standard http module
  // This allows tests to mock request making
  request_maker = request_maker || utils.request_maker;

  return function(req, res, next) {
    var options = {
      port: devops.related_apis.version_one.port,
      host: devops.related_apis.version_one.host,
      path: ['/',
             devops.related_apis.version_one.name,
             //"/rest-1.v1/Data/Defect?where=Scope='Scope:",
             //devops.related_apis.version_one.project,
             //"',Status!='Done'"].join(""),
             "/rest-1.v1/Data/Defect?where=Status.Name!='Closed'&findin=Scope.Name&find='Reach'"].join(""),
      method: 'GET',
      //auth: devops.related_apis.version_one.auth,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + new Buffer(devops.related_apis.version_one.auth).toString('base64')
      }
    };
    devops.versionone = {
        'error': null,
        'data': null
    };
    request_maker(
        options,
        function(data) {
          try {
            var etree = et.parse(data);
            devops.versionone.data = {
                'total': etree.getroot().attrib.total,
                'defects': etree.getroot().findall('./Asset').map(makeAsset)
            };
          } catch (e) {
            devops.versionone.error = e;
          }
          next();
        },
        function(e) {
          devops.versionone.error = e;
          next();
        });
  };
};
