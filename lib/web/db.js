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
var util = require('util');

var _ = require('underscore');
var async = require('async');
var sqlite3 = require('sqlite3').verbose();

var settings = require('../settings');
var utils = require('../utils');
var events = require('./events');

var db;

var SCHEMA = ["CREATE TABLE IF NOT EXISTS events (project varchar(40) NOT NULL, " +
"username varchar(40) NOT NULL, time timestamp default CURRENT_TIMESTAMP, points integer NOT NULL, "+
"related_api varchar(40) NOT NULL, id SERIAL PRIMARY KEY);"];

// a wrapper (ORM le sigh) for interacting with postgresql
stats = utils.make_class({
  init: function(){
    var self = this;
    var _path = path.join(__dirname, '..', 'db.sqlite');
    self.db = new sqlite3.Database(_path);
    // self.db.on('trace', function(event){
    //   console.log(event);
    // });
  },
  create_tables: function(cb){
    var self = this;
    var tables = [];
    _.each(SCHEMA, function(create_table){
      tables.push(_.bind(self.db.run, self.db, create_table));
    });
    async.parallel(tables, cb);
  },
  get_last_v1_time: function(project, cb){
    var self = this;

    self.db.get("SELECT max(time) as date FROM events where project=? and related_api=?;",
      [project, events.RELATED_APIS.version_one],
      function(err, results){
        return cb(err, new Date(results ? results.date : null));
      });
  },
  add_event: function(event, project, cb){
    var self = this;
    var score;

    if (!event.user){
      return null;
    }

    self.db.run("INSERT INTO events(project, username, time, points, related_api) values (?, ?, ?, ?, ?);",
      [project, event.user, event.date, event.get_points(), event.related_api],
      cb);
  },
  // TODO: this is kinda stupid, figure out how to do it the right way in pg
  add_multiple_events: function(events, project, cb){
    var self = this;
    var values = [];

    _.each(events, function(event){
      self.add_event(event, project);
    });
  },
  get_stats: function(project, start, end, cb){
    var self = this;
    var query = "SELECT username, related_api, sum(points) as score from events ";
    var args = [];
    var counter = 1;
    var where = "";
    if (start){
      where +=  " time>=? AND ";
      args.push(start);
    }
    if (end){
      where += ' time<? AND ';
      args.push(end);
    }
    if (project){
      where += " project=? ";
      args.push(project);
    }
    if (where !== ""){
      query += " where " + where;
    }
    query += " group by username order by score desc;";
    self.db.all(query, args, cb);
  }
});

module.exports = new stats();
