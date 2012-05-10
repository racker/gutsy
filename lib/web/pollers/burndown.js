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

var et = require('elementtree');
var _ = require('underscore');

var utils = require('../../utils');


var selection = ["CreateDate",
                "AssetState",
                "AssetType",
                "Estimate",
                "Timebox.Name",
                "Timebox",
                "Status"];

module.exports = function(payload) {
  var api_config = payload.config;
  var options = {
    port: api_config.port,
    host: api_config.host,
    path: ['/',
           api_config.name,
           "/rest-1.v1/Data/Defect?sel=",
           selection,
           "&where=Scope='Scope:",
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
      if (error){
        payload.error = error;
        return;
      }

      utils.parse_v1(data.data, function(err, assets){
        if (err){
          payload.error = err;
          return;
        }
      });
    });

};