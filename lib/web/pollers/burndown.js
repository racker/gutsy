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

var DAY = 1000*60*60*24;

var days_since_ephoch = function(time){
  var date = new Date(time);
  return parseInt(date.valueOf()/DAY, 10);
};
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
  function request_assets(sprints, cb){
    var defect_requests = {};
    var task_requests = {};
    var async_mega_parallel = {};
    var selection = ["CreateDate", "AssetState", "AssetType", "Estimate", "Timebox.Name", "Timebox", "ChangeDate"];
    _.each(sprints, function(sprint){
      defect_requests[sprint.id] = function(_cb){
        var path = util.format("/Data/Defect?where=Timebox='%s'&sel=%s", sprint.id, selection.join(','));
        var options = get_v1_options(path);
        request_and_parse(options, _cb);
      };
      task_requests[sprint.id] = function(_cb){
        var path = util.format("/Data/Task?where=Timebox='%s'&sel=%s", sprint.id, selection.join(','));
        var options = get_v1_options(path);
        request_and_parse(options, _cb);
      };
    });

    async_mega_parallel = {
      defects: function(_cb){
        async.parallel(defect_requests, _cb);
      },
      tasks: function(_cb){
        async.parallel(task_requests, _cb);
      }
    };
    async.parallel(async_mega_parallel, cb);
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
    var begin = new Date(now.valueOf() - 365*DAY);
    var path = util.format("/Data/Timebox?where=BeginDate>='%s';BeginDate<='%s'&sel=Schedule.ScheduledScopes,BeginDate,EndDate,Name",
        begin.toISOString(), now.toISOString());
    var options = get_v1_options(path);
    cb(null, options);
  }

  function parse_assets(_assets, cb){
    var bins = {};
    var sprint_mapper = {};
    var sprint_window = 22;

    _.each(sprints, function(sprint){
      sprint_mapper[sprint.id] = sprint;
    });
    // defect/task
    _.each(_assets, function(assets, asset_type){

      bins[asset_type] = {};

      _.each(sprints, function(sprint){
        var i = 0;
        bins[asset_type][sprint.attributes.Name] = [];
        // while(sprint_window - i >=0){
        //   bins[asset_type][sprint.attributes.Name].push(0);
        //   i ++;
        // }
      });
      // sprint
      _.each(assets, function(asset_list, sprint_id){
        var this_sprint = sprint_mapper[sprint_id];
        var name = this_sprint.attributes.Name;
        var bin = bins[asset_type][name];
        var sprint_start_day = days_since_ephoch(this_sprint.attributes.BeginDate);

        // assets in sprint
        _.each(asset_list, function(asset){
          var start = days_since_ephoch(asset.attributes.CreateDate);
          var end = days_since_ephoch(asset.attributes.ChangeDate);
          var estimate = parseInt(asset.attributes.Estimate || 1, 10);
          var iteration = asset.attributes['Timebox.Name'];
          var closed = asset.attributes.AssetState == '128';
          var i;

          // how long did the asset live in days (not assuming anything aboot being closed)?
          var run_date = end - start;
          // when, in days, does the asset come into being from the start of the sprint?
          //(can be negative, positive, etc)
          days_till_starts = start - sprint_start_day;
          // iterate through the sprint window starting on days_till_starts where i is in days
          for (i=days_till_starts; i<=days_till_starts+sprint_window; i++){
            // i must be positive (some assets are reasigned to new sprints)
            if (i<0){
              continue;
            }
            // asset must have been created during the window to not blow up graphs
            // (default assignment or something makes this funky)
            if (i>sprint_window){
              continue;
            }
            // initialize bins to 0
            if (!bin[i]){
              bin[i] = 0;
            }
            // if the thing is still alive, or if it was never closed, add the estimates.
            if (i <= run_date || !closed){
              bin[i] += estimate;
            }
          }
        });
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
    request_assets,
    parse_assets], function(err, results){
      payload.err = err;
      payload.data = results;
      if (err){
        console.log(err);
      }
    });
};