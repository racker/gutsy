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
var sqlite3 = require('sqlite3');

var settings = require('../settings');
var utils = require('../utils');

var db;

var SCHEMA = ["CREATE TABLE IF NOT EXISTS events (project varchar(40) NOT NULL, " +
"username varchar(40) NOT NULL, time timestamp default now(), points integer NOT NULL, "+
"id SERIAL PRIMARY KEY);",
"CREATE TABLE IF NOT EXISTS version_one_poll (project varchar(40), time timestamp default now(), "+
"id SERIAL PRIMARY KEY)"];

// a wrapper (ORM le sigh) for interacting with postgresql
stats = utils.make_class({
  init: function(){
    var self = this;
    var _path = path.join(__dirname, '..', 'db.sqlite');
    self.db = new sqlite3.Database(_path);
  },
  create_tables: function(cb){
    var self = this;
    var tables = [];

    _.each(SCHEMA, function(create_table){
      tables.push(_.bind(self.db.run, self.db, create_table));
    });
    async.parallel(tables, cb);
  },
  _query: function(query, values, cb, exit_on_error){
    var self = this;
    self.db.get(query, values, function(err, results){
      var counter = 1;
      if (err){
        console.error(err);
        if(exit_on_error){
          return process.exit(1);
        }
        return cb(err, null);
      }
      return cb(err, results);
    });
  },
  set_previous_v1_poll_date: function(project, date, cb){
    var self = this;
    self._query("INSERT INTO version_one_poll(project, time) values(%s, %s)",
      [project, date],
      cb);
  },
  get_previous_v1_poll_date: function(project, cb){
    var self = this;
    self._query("SELECT max(time) as date FROM version_one_poll where project=%s",
      [project],
      cb);
  },
  add_event: function(event, project, cb){
    var self = this;
    var score;

    if (!event.user){
      return null;
    }
    self._query("INSERT INTO events(project, username, time, points) values (%s, %s, %s, %s)",
      [project, event.user, event.date, event.get_points()],
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
    var query = "SELECT username, sum(points) as score from events ";
    var args = [];
    var counter = 1;
    var where = "";
    if (start){
      where +=  " time>=%s AND ";
      args.push(start);
    }
    if (end){
      where += ' time<%s AND ';
      args.push(end);
    }
    if (project){
      where += ' project = %s ';
      args.push(project);
    }
    if (where !== ""){
      query += " where " + where;
    }
    query += " group by username order by score desc";
    self._query(query,args,cb);
  }
});

module.exports = new stats();
