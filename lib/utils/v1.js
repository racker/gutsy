var util = require('util');

var _ = require('underscore');
var et = require('elementtree');

var log = require('../log');
var utils = require('./common');

exports.parse = function(data, cb){
  var etree;
  var assets;
  try{
    etree = et.parse(data);
    assets = etree.getroot().findall('./Asset').map(V1Asset);
  }catch(e){
    return cb(e);
  }
  return cb(null, assets);
};

/** an asset is a generic v1 object */
var V1Asset = utils.make_class({
  init: function(element){
    var self = this;
    self.attributes = {};
    self.relations = {};

    if (!element){
      return;
    }
    if (!element.tag || element.tag !== 'Asset'){
      return;
    }
    self.href = element.attrib.href;
    self.id = element.attrib.id;
    self.idref = element.attrib.idref;
    self.attributes = element.findall('./Attribute').map(self.make_attribute).reduce(self.reduce_attributes, {});
    self.relations = element.findall('./Relation').map(self.make_relation).reduce(self.reduce('asset'), {});
    self.text = element.text;
    },
  reduce: function(attr){
    return function(hash, named){
      hash[named.name] = named[attr];
      return hash;
    };
  },
  reduce_attributes: function (previous, current) {
    previous[current.name] = {
      text: current.text,
      values: current.values
    };
    return previous;
  },
  make_attribute: function(ele){
    return {
      name: ele.attrib.name,
      text: ele.text,
      values: ele.findall("Value").map(function(element) { return element.text; })
    };
  },
  make_relation: function(ele){
    var assets = ele.findall('./Asset');
    return {
      name: ele.attrib.name,
      asset: assets.map(function(asset){return new V1Asset(asset);})
    };
  }
});

exports.scope_maker = function(scope_list) {
  var scopes = [];
  _.each(scope_list, function(scope) {
      scopes.push(util.format("'Scope:%s'", scope));
    }
  );
  return scopes.join(",");
};

exports.match = function(string){
  var match = string.match(/([B|D])[ -_]?([0-9]+)/);
  var type, number;

  if (!match){
    return null;
  }
  type = match[1];
  number = match[2];

  if (number.length < 4 || number.length > 7){
    return null;
  }
  return {
    type: type,
    number: number,
    long_name: type === 'B' ? 'Story' : "Defect"
  };
};
exports.asset_is_open = function(asset){
  var i = 0;
  var closed_states = ["128", "Accepted", "Closed", "Completed"];
  var state = asset.attributes['Status.Name'].text;
  if (!state){
    state = parseInt(asset.attributes.AssetState.text, 10);
    // some assets have a 234 or similarly undocumented states.
    // 200,208,255 are all synonyms for deleted
    if (state > 128){
      return false;
    }
  }
  return (closed_states.indexOf(state) === -1);
};
exports.id_to_url = function(api_config, id){
  var type = id.split(":")[0];
  var _url =  util.format("https://%s/%s/%s.mvc/Summary?oidToken=%s", api_config.host,
    api_config.name, type, id);
  return encodeURI(_url);
};
