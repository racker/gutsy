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
  var sprints = [];

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
  function get_assets(sprints, cb){
    var requests = {};
    _.each(sprints, function(sprint){
      var path = util.format("/Data/Defect?where=Timebox='%s'&sel=%s", sprint.id, selection.join(','));
      var options = get_v1_options(path);
      requests[sprint.id] = function(_cb){
        request_and_parse(options, _cb);
      };
    });
    async.parallel(requests, cb);
  }
  function parse_sprints(assets, cb){
    var scope = util.format("Scope:%s", api_config.project);
    _.each(assets, function(asset){
      _.each(asset.relations['Schedule.ScheduledScopes'], function(rel){
        if(rel.idref && rel.idref === scope){
          sprints.push(asset);
        }
      });
    });
    sprints = sprints.slice(-3);
    cb(null, sprints);
  }
  function get_sprint_options(cb){
    now = new Date();
    var begin = new Date(now.valueOf() - 365*24*60*60*1000);
    var path = util.format("/Data/Timebox?where=BeginDate>='%s';BeginDate<='%s'&sel=Schedule.ScheduledScopes,BeginDate,EndDate,Name",
        begin.toISOString(), now.toISOString());
    var options = get_v1_options(path);
    cb(null, options);
  }

  function parse_assets(defects, cb){
    var bins = {};
    var sprint_mapper = {};
    var one_day = 1000*60*60*24;
    _.each(sprints, function(sprint){
      bins[sprint.attributes.Name] = [];
      sprint_mapper[sprint.id] = sprint.attributes.Name;
    });
    _.each(defects, function(defect_list, sprint){
      var total_points = 0;
      var name = sprint_mapper[sprint];
      var bin = bins[name];
      _.each(defect_list, function(defect){
        var start = new Date(defect.attributes.CreateDate).valueOf();
        var end = new Date(defect.attributes.ChangeDate).valueOf();
        var estimate = parseInt(defect.attributes.Estimate || 1, 10);
        var iteration = defect.attributes['Timebox.Name'];
        total_points += estimate;
        var i = 0;

        while (start < end){
          if (!bin[i]){
            bin[i] = estimate;
          }else{
            bin[i] += estimate;
          }
          i++;
          start += one_day;
        }
      });
    });
    cb(null, bins);
  }

  function request_and_parse(options, cb){
    utils.request_maker(options, function(err, results){
      if (err){
        return cb(err);
      }
      utils.parse_v1(results.data, cb);
    });
  }
  async.waterfall([
    get_sprint_options,
    request_and_parse,
    parse_sprints,
    get_assets,
    parse_assets], function(err, results){
      console.log(err);
      payload.data = results;
    });
};