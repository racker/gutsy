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

var asset_binner_factory = function(bin, sprint_start_day, sprint_window){
  return function(asset){
    var start = days_since_epoch(asset.attributes.CreateDate);
    var end = days_since_epoch(asset.attributes.ChangeDate);
    var estimate = parseInt(asset.attributes.Estimate || 1, 10);
    var iteration = asset.attributes['Timebox.Name'];
    var closed = asset.attributes.AssetState == '128';
    var i;
    // how long did the asset live in days (not assuming anything aboot being closed)?
    var run_date = end - start;
    // when, in days, does the asset come into being from the start of the sprint?
    //(can be negative, positive, etc)
    var days_till_starts = start - sprint_start_day;
    // iterate through the sprint window starting on days_till_starts where i is in days
    i = days_till_starts - 1;
    while ( i <= sprint_window ){
      i += 1;
      // i must be positive (some assets are reasigned to new sprints)
      if (i<0){
        continue;
      }
      // if the thing was closed and we have passed that day, move on
      if (closed && i > (end - sprint_start_day)){
        break;
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
  };
};

function request_and_parse(options, cb){
  utils.request_maker(options, function(err, results){
    if (err){
      return cb(err);
    }
    utils.parse_v1(results.data, cb);
  });
}

var days_since_epoch = function(time){
  var date = new Date(time);
  return parseInt(date.valueOf()/DAY, 10);
};

module.exports = utils.make_class({
  sprint_window: 22,
  init: function(payload) {
    var self = this;
    self.api_config = payload.config;
    self.sprints = [];
    self.sprint_mapper = {};

    async.waterfall([
      _.bind(self.get_sprint_options, self),
      _.bind(request_and_parse, self),
      _.bind(self.parse_sprints, self),
      _.bind(self.request_assets, self),
      _.bind(self.parse_assets, self)],
      function(err, results){
        payload.err = err;
        payload.data = results;
        if (err){
          console.error(err);
        }
    });
  },
  get_v1_options: function (get_query){
    var self = this;
    return {
      port: self.api_config.port,
      host: self.api_config.host,
      path: ['/',
             self.api_config.name,
             "/rest-1.v1",
             get_query
             ].join(""),
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + new Buffer(self.api_config.auth).toString('base64')
      }
    };
  },
  get_sprint_options: function (cb){
    var self = this;
    var now = new Date();
    var begin = new Date(now.valueOf() - 365*DAY);
    var scope = "";
    _.each(self.api_config.project, function(i) {scope += "'Scope:" + i + "',";});
    scope = scope.substring(0, scope.length - 1);
    var path = util.format("/Data/Timebox?where=Schedule.ScheduledScopes=%s;BeginDate>='%s';BeginDate<='%s'&sel=Schedule.ScheduledScopes,BeginDate,EndDate,Name",
        scope, begin.toISOString(), now.toISOString());
    console.log(path);
    var options = self.get_v1_options(path);
    cb(null, options);
  },
  set_sprints: function(sprints){
    var self = this;
    // take the last three and hope for the best
    self.sprints = sprints.slice(-3);
    _.each(self.sprints, function(sprint){
      self.sprint_mapper[sprint.id] = sprint;
    });
    return self.sprints;
  },
  get_sprint: function(sprint_id){
    var self = this;
    return self.sprint_mapper[sprint_id];
  },
  parse_sprints: function (assets, cb){
    var self = this;
    var sprints = [];
    _.each(assets, function(asset){
      _.each(asset.relations['Schedule.ScheduledScopes'], function(rel){
          sprints.push(asset);
        }
      );
    });
    self.set_sprints(sprints);
    cb(null, self.sprints);
  },
  _sprint_asset_request_maker: function(sprint, type){
    var self = this;
    var selection = ["CreateDate", "AssetState", "AssetType", "Estimate",
      "Timebox.Name", "Timebox", "ChangeDate"];
    return function(cb){
      var path = util.format("/Data/%s?where=Timebox='%s'&sel=%s", type, sprint.id, selection.join(','));
      var options = self.get_v1_options(path);
      request_and_parse(options, cb);
    };
  },
  request_assets: function(sprints, cb){
    var self = this;
    var defect_requests = {};
    var task_requests = {};

    _.each(sprints, function(sprint){
      defect_requests[sprint.id] = self._sprint_asset_request_maker(sprint, 'Defect');
      task_requests[sprint.id] = self._sprint_asset_request_maker(sprint, 'Task');
    });

    async.parallel({
      defects: function(_cb){
        async.parallel(defect_requests, _cb);
      },
      tasks: function(_cb){
        async.parallel(task_requests, _cb);
      }
    }, cb);
  },
  parse_assets: function(asset_classes, cb){
    var self = this;
    var bins = {};

    // {defects: [{sprint1:[{asset1},{asset2}]}]}

    // defect/task
    _.each(asset_classes, function(assets, asset_type){

      //initialize bins for asset type
      bins[asset_type] = {};
      _.each(self.sprints, function(sprint){
        bins[asset_type][sprint.attributes.Name] = [];
      });
      // sprint
      _.each(assets, function(asset_list, sprint_id){
        var this_sprint;
        var name;
        var bin;
        var sprint_start_day;
        var asset_binner;

        this_sprint = self.get_sprint(sprint_id);
        name = this_sprint.attributes.Name;
        bin = bins[asset_type][name];
        sprint_start_day = days_since_epoch(this_sprint.attributes.BeginDate);
        _bin_asset = asset_binner_factory(bin, sprint_start_day, self.sprint_window);
        // assets in sprint
        _.each(asset_list, _bin_asset);
      });
    });
    cb(null, bins);
  }
});
