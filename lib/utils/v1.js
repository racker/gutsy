var util = require('util');

var _ = require('underscore');
var et = require('elementtree');

var log = require('../log');
var utils = require('./common');
var notes = require('../web/release_notes/notes');

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

exports.scope_maker = function(scope_list) {
  var scopes = [];
  _.each(scope_list, function(scope) {
      scopes.push(util.format("'Scope:%s'", scope));
    }
  );
  return scopes.join(",");
};

var v1_number_to_type = function(v1_number){
  switch (v1_number){
    case 'B': case 'STORY':
      return 'Story';
    case "D": case "DEFECT":
      return 'Defect';
    case "TK": case "TASK":
      return "Task";
    case "AT": case "TEST":
      return "Test";
    default:
      return undefined;
  }
};
exports.v1_number_to_type = v1_number_to_type;

var V1_ASSET_RE = /(B|D|AT|TK|STORY|DEFECT|TASK|TEST)[^a-zA-Z0-9]?([0-9]{4,7})/i;
exports.match = function(string){
  var match = string.match(V1_ASSET_RE);
  var type, number, long_name;

  if (!match){
    return null;
  }
  type = match[1].toUpperCase();
  number = match[2];

  long_name = v1_number_to_type(type);
  if(long_name === undefined){
    throw new Error('How did we get this type?!?: ' + type);
  }

  return {
    type: type,
    number: number,
    long_name: long_name
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
  if (!api_config || !id){
    return '';
  }
  var type = id.split(":")[0];
  var _url =  util.format("https://%s/%s/%s.mvc/Summary?oidToken=%s", api_config.host,
    api_config.name, type, id);
  return encodeURI(_url);
};

exports.options = function(v1_config, path){
  if (path instanceof Array){
    path = path.join('');
  }
  path = util.format('/%s/rest-1.v1%s',v1_config.name, path);
  return {
    port: v1_config.port,
    host: v1_config.host,
    path: path,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + new Buffer(v1_config.auth).toString('base64')
    }
  };
};

