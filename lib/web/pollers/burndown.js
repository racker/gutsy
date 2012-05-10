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
var util = require('util');

var et = require('elementtree');
var async = require('async');
var _ = require('underscore');

var utils = require('../../utils');

var selection = ["CreateDate",
                "AssetState",
                "AssetType",
                "Estimate",
                "Timebox.Name",
                "Timebox",
                "ChangeDate"];


module.exports = function(payload) {
  var api_config = payload.config;

  function get_v1_options(get_query){
    return {
      port: api_config.port,
      host: api_config.host,
      path: ['/',
             api_config.name,
             "/rest-1.v1",
             get_query
             ].join(""),
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + new Buffer(api_config.auth).toString('base64')
      }
    };
  }
  function get_asset_options(sprints, cb){
    var sprint = sprints[0];
    var path = util.format("/Data/Defect?where=Timebox='%s'&sel=%s", sprint, selection.join(','));
    var options = get_v1_options(path);
    console.log(options.path);
    cb(null, options);
  }
  function parse_sprints(assets, cb){
    var sprints = [];
    var scope = util.format("Scope:%s", api_config.project);
    _.each(assets, function(asset){
      _.each(asset.relations['Schedule.ScheduledScopes'], function(rel){
        if(rel.idref && rel.idref === scope){
          sprints.push(asset.id);
        }
      });
    });
    cb(null, sprints);
  }
  function get_sprint_options(cb){
    now = new Date();
    var begin = new Date(now.valueOf() - 365*24*60*60*1000);

    var path = util.format("/Data/Timebox?where=BeginDate>='%s';BeginDate<='%s'&sel=Schedule.ScheduledScopes,BeginDate,EndDate",
        begin.toISOString(), now.toISOString());
    var options = get_v1_options(path);
    cb(null, options);
  }

  function parse_assets(defects, cb){
    var bins = {};
    _.each(defects, function(defect){
      var opened = new Date(defect.attributes.CreateDate);
      var changed = new Date(defect.attributes.ChangeDate);
      var estimate = defect.attributes.Estimate || 1;
      var iteration = defect.attributes['Timebox.Name'];
    });
  }

  function parse_v1_response(data, cb){
    utils.parse_v1(data.data, cb);
  }

  function request_and_parse(options, cb){
    utils.request_maker(options, function(err, results){
      if (err){
        return cb(err);
      }
      utils.parse_v1(data.data, cb);
    });
  }
  async.waterfall([
    get_sprint_options,
    request_and_parse,
    parse_sprints,
    get_asset_options,
    request_and_parse,
    parse_assets], function(err, results){
      console.log(err);
      payload.data = results;
    });
};