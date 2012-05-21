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
    self.this_sprint = null;

    async.waterfall([
      _.bind(self.get_sprint_options, self),
      _.bind(request_and_parse, self),
      _.bind(self.parse_sprints, self),
      _.bind(self.request_assets, self),
      _.bind(self.parse_assets, self)],
      function(err, burndown, churn){
        payload.err = err;
        payload.data = {burndown: burndown, churn: churn};
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
    var path = util.format("/Data/Timebox?where=BeginDate>='%s';BeginDate<='%s'&sel=Schedule.ScheduledScopes,BeginDate,EndDate,Name",
        begin.toISOString(), now.toISOString());
    var options = self.get_v1_options(path);
    cb(null, options);
  },
  set_sprints: function(sprints){
    var self = this;
    // take the last three and hope for the best
    var max_date = 0;
    self.sprints = sprints.slice(-3);
    _.each(self.sprints, function(sprint){
      var date = Date.parse(sprint.attributes.BeginDate);
      if (!self.this_sprint || date > max_date){
        self.sprint_mapper[sprint.id] = sprint;
        self.this_sprint = sprint;
        max_date = date;
      }
    });
  },
  get_sprint: function(sprint_id){
    var self = this;
    return self.sprint_mapper[sprint_id];
  },
  parse_sprints: function (assets, cb){
    var self = this;
    var sprints = [];
    var scope = util.format("Scope:%s", self.api_config.project);
    _.each(assets, function(asset){
      _.each(asset.relations['Schedule.ScheduledScopes'], function(rel){
        if(rel.idref && rel.idref === scope){
          sprints.push(asset);
        }
      });
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
    var weekly = {};

    // {defects: [{sprint1:[{asset1},{asset2}]}]}

    // defect/task
    _.each(asset_classes, function(assets, asset_type){

      //initialize bins for asset type
      bins[asset_type] = {};
      weekly[asset_type] = {opened: [], closed: []};
      _.each(self.sprints, function(sprint){
        bins[asset_type][sprint.attributes.Name] = [];
      });

      _.range(0, self.sprint_window).forEach(function(item){
        weekly[asset_type].opened[item] = 0;
        weekly[asset_type].closed[item] = 0;
      });

      // sprint
      _.each(assets, function(asset_list, sprint_id){
        var this_sprint;
        var name;
        var bin;
        var sprint_start_day;
        this_sprint = self.get_sprint(sprint_id);
        sprint_start_day = days_since_epoch(this_sprint.attributes.BeginDate);
        name = this_sprint.attributes.Name;
        bin = bins[asset_type][name];
        self.bin_for_burndown(asset_list, bin, sprint_start_day);
        self.bin_for_breakdown(asset_list, weekly[asset_type]);
      });
    });
    cb(null, bins, weekly);
  },
  bin_for_breakdown: function(assets, bin){
    var self = this;
    var this_sprint_start = days_since_epoch(self.this_sprint.attributes.BeginDate);
    var _binner = function(asset){
      var start = days_since_epoch(asset.attributes.CreateDate);
      var end = days_since_epoch(asset.attributes.ChangeDate);
      var closed = asset.attributes.AssetState == '128';
      if(bin.opened[start-this_sprint_start] !== undefined){
        bin.opened[start-this_sprint_start]++;
      }
      if(closed && bin.closed[end-this_sprint_start] !== undefined){
        bin.closed[end-this_sprint_start]++;
      }
    };
    _.each(assets, _binner);
  },
  bin_for_burndown: function(assets, bin, sprint_start_day){
    var self = this;

    var _binner = function(asset){
      var start = days_since_epoch(asset.attributes.CreateDate);
      var end = days_since_epoch(asset.attributes.ChangeDate);
      var estimate = parseInt(asset.attributes.Estimate || 1, 10);
      var closed = asset.attributes.AssetState == '128';
      var i;

      // how long did the asset live in days (not assuming anything aboot being closed)?
      var run_date = end - start;
      // when, in days, does the asset come into being from the start of the sprint?
      //(can be negative, positive, etc)
      var days_till_starts = start - sprint_start_day;
      // iterate through the sprint window starting on days_till_starts where i is in days
      i = days_till_starts - 1;
      while ( i <= self.sprint_window ){
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
    _.each(assets, _binner);
  }
});
