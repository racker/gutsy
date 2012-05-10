/*
 *  Copyright 2011 Rackspace
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */
var fs = require('fs');
var path = require('path');

var _ = require('underscore');

var settings = require('../settings');
var utils = require('../utils');

var load = function(){
  var config = {};
  var path_to_jsons = path.join(__dirname, '..', '..', settings.idjson_path);
  var jsons;
  try{
    jsons = fs.readdirSync(path_to_jsons);
  }catch(e){
    utils.die('Go add some json files to your idjson path');
  }
  if (!jsons){
    return;
  }
  _.each(jsons, function(id_json){
    try{
      var file = fs.readFileSync(path.join(path_to_jsons, id_json), 'utf8');
      var data = JSON.parse(file);
      if (data.version_one && data.github){
        config[data.version_one] = data.github;
      }
    }catch(e){}
  });
  return config;
};

exports.load = load;