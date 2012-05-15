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

var SCHEMA = ["CREATE TABLE IF NOT EXISTS events (project VARCHAR(40) NOT NULL, " +
  "username varchar(40) NOT NULL, " +
  "time TIMESTAMP NOT NULL, " +
  "points INTEGER NOT NULL, " +
  "related_api VARCHAR(40) NOT NULL, " +
  "details TEXT, " +
  "story_points INTEGER, " +
  "multiplier INTEGER, " +
  "url TEXT, " +
  "title TEXT, " +
  "id INTEGER PRIMARY KEY);",

"CREATE TABLE IF NOT EXISTS metrics (project VARCHAR(40) NOT NULL," +
  "service_name VARCHAR(40) PRIMARY KEY, " +
  "time TIMESTAMP DEFAULT CURRENT_TIMESTAMP, "+
  "health TINYINT NOT NULL, " +
  "ip VARCHAR(20) NOT NULL, " +
  "services TEXT NOT NULL);",

  "CREATE TABLE IF NOT EXISTS aliases (display_name VARCHAR(40) NOT NULL, " +
  "alias TEXT NOT NULL, UNIQUE(display_name, alias));"
];
// TODO: back up aliases before changing schemas

// a wrapper (ORM le sigh) for interacting with sqlite3
module.exports = new utils.make_class({
  init: function(){
    var self = this;
    var _path = path.join(__dirname, '..', 'db.sqlite');
    self.db = new sqlite3.Database(_path);
    if (settings.debug) {
      self.db.on('trace', function(event){
        console.log(event);
      });
    }
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
    var details;
    var score;

    //console.log("adding event");
    //console.log(event);
    if (!event.user){
      console.log("No user for event. Not inserting.", event);
      return null;
    }

    details = JSON.stringify(event.details);
    //console.log(details);
    self.db.run("INSERT INTO events(project, username, time, points, related_api, details, story_points, multiplier, url, title) values (?, ?, ?, ?, ?, ?, ?, ?, ? , ?);",
      [project, event.user, event.date, event.get_points(), event.related_api, details, event.story_points, event.multiplier, event.url, event.title],
      cb);
  },
  // TODO: this is kinda stupid, figure out how to do it the right way
  add_multiple_events: function(events, project, cb){
    var self = this;
    var values = [];

    _.each(events, function(event){
      self.add_event(event, project);
    });
  },
  add_aliais: function(display_name, alias, cb){
    self.db.run("INSERT INTO aliases(display_name, alias) VALUES(?, ?);", [display_name, alias], cb);
  },
  get_highscores: function(project, start, end, cb){
    var self = this;
    var query = "SELECT COALESCE(display_name, username) as name, sum(points) as score from events " +
    "LEFT OUTER JOIN aliases on username=alias";
    var args = [];
    var where = "";
    if (start){
      start = new Date(start).valueOf();
      where += " time>=? AND ";
      args.push(start);
    }
    if (end){
      end = new Date(end).valueOf();
      where += ' time<? AND ';
      args.push(end);
    }
    if (project){
      where += " project=? ";
      args.push(project);
    }

    if (where.length > 0){
      query += " where " + where;
    }

    query += " group by username order by score desc;";

    self.db.all(query, args, cb);
  },

  get_highscore_breakdown: function(project, start, end, username, cb){
    var self = this;
    var query = "SELECT COALESCE(display_name, username) as name, time, points, related_api, " +
    "story_points, multiplier, url, title, id from events outer left join aliases on username=alias ";
    var args = [];
    var where = "";
    if (start){
      where += " time>=? AND ";
      args.push(start);
    }
    if (end){
      where += " time<? AND ";
      args.push(end);
    }
    if (username) {
      where += " username=? AND ";
      args.push(username);
    }
    if (project){
      where += " project=? ";
      args.push(project);
    }

    if (where.length > 0){
      query += " where " + where;
    }

    query += " order by time desc;";

    self.db.all(query, args, cb);
  },
  add_service_stat: function(project, ip, host_data, cb){
    var self = this;
    self.db.run("INSERT OR REPLACE INTO metrics (project, service_name, health, ip, time, services) " +
      "VALUES (?, ?, ?, ?, ?, ?)", [ project, host_data.name, host_data.health, ip,
      host_data.timestamp, JSON.stringify(host_data.services)], function(err, results){
        if (err){
          console.log(err);
        }
        if (cb){
          cb(err, results);
        }
      });
  },
  get_service_stats: function(project, cb){
    var self = this;
    return self.db.all("SELECT * FROM metrics where project=?", project, function(err, results){
      _.each(results, function(row){
        row.services = JSON.parse(row.services);
      });
      cb(err, results);
    });
  }
})();
