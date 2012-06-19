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

var utils = require('../../utils').common;
var constants = require('../../utils').constants;

var v1 = require('../../utils').v1;

var DAY = 1000*60*60*24;

var days_since_epoch = function(time){
  var date = new Date(time);
  return parseInt(date.valueOf()/DAY, 10);
};

module.exports.poll_interval = 30 * 60 * 1000;

module.exports = utils.make_class({

  sprint_window: constants.SPRINT_WINDOW,
  delimiter: constants.DELIMITER,

  init: function(payload) {
    var self = this;
    self.api_config = payload.get_config('version_one');
    self.sprints = [];
    self.sprint_mapper = {};
    self.sprint_ids_to_names = {};

    async.waterfall([
      _.bind(self.get_sprint_options, self),
      _.bind(self.request_and_parse, self),
      _.bind(self.parse_sprints, self),
      _.bind(self.request_assets, self),
      _.bind(self.parse_assets, self)],
      function(err, results){
        payload.set_data(err, results);
    });
  },
  get_sprint_options: function (cb){
    var self = this;
    var now = new Date();
    var begin = new Date(now.valueOf() - 365*DAY);
    var scope = self.api_config.project[0]; // We need any of the appropriate scopes.
    var path = util.format("/Data/Timebox?where=Schedule.ScheduledScopes='Scope:%s';BeginDate>='%s';BeginDate<='%s'&sel=Schedule.ScheduledScopes,BeginDate,EndDate,Name,Schedule.ScheduledScopes.Name",
        scope, begin.toISOString(), now.toISOString());
    var options = v1.options(self.api_config, path);
    cb(null, options);
  },
  set_sprints: function(sprints){
    var self = this;
    // take the last three and hope for the best
    self.sprints = sprints.slice(-3);
    _.each(sprints, function(sprint){
      self.sprint_mapper[sprint.id] = sprint;
    });

    _.each(sprints, function(sprint){
      var name;
      var value;
      for (var i = 0; sprint.attributes['Schedule.ScheduledScopes.Name'].values[i]; i++) {
        name = sprint.relations['Schedule.ScheduledScopes'][i].idref.split(':')[1];
        value = sprint.attributes['Schedule.ScheduledScopes.Name'].values[i];
        self.sprint_ids_to_names[name] = value;
      }
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
      sprints.push(asset);
    });
    self.set_sprints(sprints);
    cb(null, self.sprints);
  },
  _sprint_asset_request_maker: function(sprint, scope, type){
    var self = this;
    var selection = ["DetailEstimate", "ChangeDate", "AssetState", "Status.Name", "CreateDate"].join(',');
    return function(cb){
      var path = util.format("/Hist/%s?where=Timebox='%s';Scope='Scope:%s'&sel=%s", type, sprint.id, scope, selection);
      var options = v1.options(self.api_config, path);
      self.request_and_parse(options, cb);
    };
  },
  request_and_parse: function (options, cb){
    var self = this;
    utils.request_maker(options, function(err, results){
      if (err){
        return cb(err);
      }
      v1.parse(results.data, cb);
    });
  },
  request_assets: function(sprints, cb){
    var self = this;
    var defect_requests = {};
    var task_requests = {};

    _.each(self.api_config.project, function(scope) {
      _.each(sprints, function(sprint){
        defect_requests[scope + self.delimiter + sprint.id] = self._sprint_asset_request_maker(sprint, scope, 'Defect');
        task_requests[scope + self.delimiter + sprint.id] = self._sprint_asset_request_maker(sprint, scope, 'Task');
      });
    });


    async.parallel({
      Defects: function(_cb){
        async.parallel(defect_requests, _cb);
      },
      Tasks: function(_cb){
        async.parallel(task_requests, _cb);
      }
    }, cb);
  },
  parse_histories: function(history) {
    var asset;
    var assets = {};
    var i = 1;
    var id;
    var state;
    var closed_states = {
      "128": i++,
      "Accepted": i++,
      "Closed": i++,
      "Completed": i++
    };
    for (i=0; i<history.length; i++){
      asset = history[i];
      id = asset.id.split(":")[1];
      state = asset.attributes['Status.Name'].text;
      if (!state){
        state = parseInt(asset.attributes.AssetState.text, 10);
        // some assets have a 234 or similarly undocumented states.
        // 200,208,255 are all synonyms for deleted
        if (state > 128){
          continue;
        }
      }
      asset.state = closed_states[state] || 0;
      asset.closed = asset.state > 0 ? true : false;
      asset.id = id;
      if ( assets[id] === undefined) {
        assets[id] = asset;
        continue;
      }
      if ( asset.state > assets[id].state ){
        assets[id] = asset;
      }
    }
    return _.values(assets);
  },
  bin_assets: function(assets, sprint_start_day, bin){
    var self = this;
    bin = bin || [];
    var _asset_binner = function(asset){
      var start = days_since_epoch(asset.attributes.CreateDate.text);
      var end = days_since_epoch(asset.attributes.ChangeDate.text);
      var estimate = parseInt(asset.attributes.DetailEstimate.text || 1, 10);
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
        if ( asset.closed && i > (end - sprint_start_day) ){
          break;
        }
        // initialize bins to 0
        if (!bin[i]){
          bin[i] = 0;
        }
        // if the thing is still alive, or if it was never closed, add the estimates.
        if ( i <= run_date || !asset.closed ){
          bin[i] += estimate;
        }
      }
    };
    _.each(assets, _asset_binner);
    return bin;
  },
  parse_assets: function(asset_classes, cb){
    var self = this;
    var bins = {};

    _.each(asset_classes, function(assets, asset_type){
      _.each(assets, function(asset_list, scope_sprint){
        var this_sprint;
        var sprint_name;
        var sprint_start_day;
        var scope;
        var sprint_id;
        var bin;
        var scope_name;

        scope = scope_sprint.split(self.delimiter)[0];
        scope_name = self.sprint_ids_to_names[scope];

        if (bins[scope_name] === undefined) {
          bins[scope_name] = {};
        }
        if (bins.Total === undefined) {
          bins.Total = {};
        }
        if (bins[scope_name][asset_type] === undefined) {
          bins[scope_name][asset_type] = {};
        }
        if (bins.Total[asset_type] === undefined) {
          bins.Total[asset_type] = {};
        }

        sprint_id = scope_sprint.split(self.delimiter)[1];
        bins[scope_name][asset_type] = bins[scope_name][asset_type] || {};

        this_sprint = self.get_sprint(sprint_id);
        sprint_name = this_sprint.attributes.Name.text;
        sprint_start_day = days_since_epoch(this_sprint.attributes.BeginDate.text);
        asset_list = self.parse_histories(asset_list);

        bin = self.bin_assets(asset_list, sprint_start_day);
        bins.Total[asset_type][sprint_name] = self.bin_assets(asset_list, sprint_start_day, bins.Total[asset_type][sprint_name]);
        // assets in sprint
        bins[scope_name][asset_type][sprint_name] = bin;
      });
    });
    cb(null, bins);
  }
});
