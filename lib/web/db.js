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
var utils = require('../utils').common;
var events = require('./events');
var log = require('../log');

var EVENTS = events.EVENT_TYPES;

var db;

var INTEGRITY_ERROR = 19;

var SCHEMA = ["CREATE TABLE IF NOT EXISTS events (project VARCHAR(40) NOT NULL, " +
  "user varchar(40) NOT NULL, " +
  "time TIMESTAMP NOT NULL, " +
  "related_api VARCHAR(40) NOT NULL, " +
  "id TEXT, " +
  "points INTEGER, " +
  "event TEXT, " +
  "url TEXT, " +
  "title TEXT, UNIQUE(project, id, user, related_api, event));",

  // TODO: we're storing "ok" and "err" in health. fix that
  "CREATE TABLE IF NOT EXISTS metrics (project VARCHAR(40) NOT NULL," +
  "service_name VARCHAR(40) PRIMARY KEY, " +
  "time TIMESTAMP DEFAULT CURRENT_TIMESTAMP, "+
  "healthy BOOL NOT NULL, " +
  "ttl TINYINT NOT NULL, " +
  "ip VARCHAR(20) NOT NULL, " +
  "services TEXT NOT NULL);",

  "CREATE TABLE IF NOT EXISTS multipliers (event VARCHAR(40) PRIMARY KEY NOT NULL, "+
  "value TINYINT NOT NULL);",

  "CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY NOT NULL, "+
  "name VARCHAR(60) NOT NULL, " +
  "url VARCHAR(1024) NOT NULL, " +
  "devops_json TEXT, " +
  "creds TEXT, " +
  "crawl_error TEXT, " +
  "updated_at TIMESTAMP, " +
  "UNIQUE(name), CHECK(name <> ''));",

  "CREATE TABLE IF NOT EXISTS alias_display (id INTEGER PRIMARY KEY, " +
  "display_name VARCHAR(40) NOT NULL, UNIQUE(display_name));",

  "CREATE TABLE IF NOT EXISTS aliases (alias_display_id REFERENCES alias_display(id) NOT NULL," +
  "alias TEXT NOT NULL, related_api VARCHAR(40) NOT NULL, "+
  "UNIQUE(alias, related_api), UNIQUE(alias, alias_display_id), UNIQUE(related_api, alias_display_id));"
];
// TODO: back up aliases before changing schemas

// a wrapper (ORM le sigh) for interacting with sqlite3
module.exports = new utils.make_class({
  init: function(){
    var self = this;
    var _path = path.join(__dirname, '..', 'db.sqlite');
    self.db = new sqlite3.Database(_path);
    self.db.on('trace', function(event){
      log.debug(event.toString());
    });
  },
  create_tables: function(cb){
    var self = this;
    var queries = [];
    log.log("Creating tables...");
    // create schema if needed
    _.each(SCHEMA, function(create_table){
      queries.push(_.bind(self.db.run, self.db, create_table));
    });
    // update multipliers
    _.each(events.EVENT_TYPES, function(event){
      queries.push(_.bind(self.db.run, self.db,
        "INSERT OR REPLACE INTO multipliers (event, value) VALUES (?, ?)",
        event.name, event.multiplier)
      );
    });
    async.series(queries, function(err, results){
      if (err){
        utils.die("Creating tables failed:", err);
      }
      cb(err, results);
    });
  },
  squelch_integrity_error: function (cb) {
    var self = this;
    return function (err, result) {
      if (err && err.errno === INTEGRITY_ERROR) {
        err = null;
      }
      if (cb) {
        cb(err, result);
      }
    };
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

    if (!event.user){
      log.log("No user for event. Not inserting.", event);
      return cb();
    }
    self.db.run("INSERT INTO events(project, user, time, points, related_api, id, event, url, title) " +
      "values (?, ?, ?, ?, ?, ?, ?, ?, ?);",
      [project, event.user, event.date, event.points, event.related_api, event.id,
      event.event.name, event.url, event.title], self.squelch_integrity_error(cb));
  },
  // TODO: this is kinda stupid, figure out how to do it the right way
  add_multiple_events: function(events, project, cb){
    var self = this;
    var values = [];

    _.each(events, function(event){
      self.add_event(event, project);
    });
  },
  get_highscores: function(project, start, end, cb){
    var self = this;
    var query = "SELECT COALESCE((SELECT display_name from alias_display where "+
      "id=aliases.alias_display_id), user) as name, user, "+
      "sum(points * (SELECT value FROM multipliers WHERE event=events.event)) as score from events " +
      "LEFT OUTER JOIN aliases on user=alias and events.related_api=aliases.related_api ";
    var args = [];
    var where = "";
    if (start){
      start = Date.parse(start);
      where += " time>=? AND ";
      args.push(start);
    }
    if (end){
      end = Date.parse(end);
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

    query += " group by name order by score desc;";

    self.db.all(query, args, cb);
  },
  get_highscore_breakdown: function(project, start, end, user, cb){
    var self = this;
    var query = "SELECT COALESCE((SELECT display_name from alias_display where "+
      "id=aliases.alias_display_id), user) as name, "+
      "user, time, events.related_api, (SELECT value FROM multipliers WHERE event=events.event) as multiplier, " +
      "points * (SELECT value FROM multipliers WHERE event=events.event) as score, points, "+
      "event, url, title, id from events outer left join aliases on user=alias " +
      "and events.related_api=aliases.related_api ";
    var args = [];
    var where = "";
    if (start){
      where += " time>=? AND ";
      args.push(Date.parse(start));
    }
    if (end){
      where += " time<? AND ";
      args.push(Date.parse(end));
    }
    if (user) {
      where += " name=? AND ";
      args.push(user);
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
  get_aliases: function(display_name, cb){
    var self = this;
    self.db.all("SELECT * FROM aliases WHERE alias_display_id="+
      "(SELECT id FROM alias_display WHERE display_name=?);", display_name, cb);
  },
  get_db: function () {
    var self = this;
    return self.db;
  },
  add_alias: function(alias, display_name, related_api, alias_display_id, cb){
    var self = this;
    var db_ops = [];

    if (!events.RELATED_APIS[related_api]){
      return cb(new Error('use the enum'+related_api));
    }

    if (!display_name || display_name.length <= 0) {
      return cb(new Error("No display name!"));
    }

    if (alias_display_id) {
      db_ops.push(function (cb) {
        self.db.run("UPDATE alias_display SET display_name = ? WHERE id = ?",
          [display_name, alias_display_id], self.squelch_integrity_error(cb));
      });
    }
    else {
      db_ops.push(function (cb) {
        self.db.run("INSERT INTO alias_display (display_name) VALUES (?);",
          [display_name], self.squelch_integrity_error(cb));
      });
    }

    db_ops.push(function (cb) {
      self.db.run("INSERT OR REPLACE INTO aliases(alias, related_api, alias_display_id) "+
        "VALUES(?, ?, COALESCE(?, (SELECT id FROM alias_display WHERE alias_display.display_name=?)));",
      [alias, related_api, alias_display_id || null, display_name], self.squelch_integrity_error(cb));
    });

    async.series(db_ops, cb);
  },
  delete_alias: function(related_api, alias_display_id, cb){
    var self = this;
    self.db.run("DELETE FROM aliases WHERE alias_display_id =? AND related_api = ?;",
      alias_display_id, related_api, cb
    );
  },
  add_service_stat: function(project, ip, host_data, cb){
    var self = this;
    self.db.run("INSERT OR REPLACE INTO metrics (project, service_name, healthy, ttl, ip, time, services) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?);", [ project, host_data.name, host_data.healthy,
      host_data.ttl, ip, host_data.timestamp, JSON.stringify(host_data.services)],
      self.squelch_integrity_error(cb));
  },
  get_service_stats: function(project, cb){
    var self = this;
    return self.db.all("SELECT * FROM metrics where project=?;", project, function(err, results){
      _.each(results, function(row){
        row.services = JSON.parse(row.services);
        if (Date.now() - row.time > (row.ttl * 1000)) {
          row.healthy = false;
          _.each(row.services, function (service) {
            service.error_msg = "TTL expired! Also, " + (service.error_msg || "... nothing.");
            service.healthy = false;
          });
        }
      });
      cb(err, results);
    });
  },
  get_pr_close_user: function(id, api, cb){
    var self = this;
    return self.db.get('SELECT user FROM events WHERE id=? AND related_api=? AND event=?;',
        id, api, EVENTS.closed.name, cb);
  },
  get_projects: function (name, cb) {
    var self = this;
    if (name === undefined) {
      return self.db.all("SELECT * FROM projects;", cb);
    }
    else {
      return self.db.get("SELECT * FROM projects WHERE name = ?;", [name], cb);
    }
  },
  add_project: function (name, url, devops_json, creds, cb) {
    var self = this;
    return self.db.run("INSERT INTO projects (name, url, devops_json, creds) VALUES (?, ?, ?, ?);", [name, url, devops_json, creds], cb);
  },
  update_project: function (id, name, url, devops_json, creds, crawl_error, cb) {
    var self = this;
    var query = [];
    var query_str = "UPDATE projects SET ";
    var query_args = [];
    var i;

    if (name !== undefined) {
      query.push("name = ?");
      query_args.push(name);
    }
    if (url !== undefined) {
      query.push("url = ?");
      query_args.push(url);
    }
    if (devops_json !== undefined) {
      query.push("devops_json = ?");
      query_args.push(devops_json);
      query.push("crawl_error = ?");
      query_args.push("");
    }
    else if (crawl_error) {
      query.push("crawl_error = ?");
      query_args.push(crawl_error.toString());
    }

    query.push("updated_at = ?");
    query_args.push(Date.now());

    if (creds !== undefined) {
      query.push("creds = ?");
      query_args.push(creds);
    }

    for (i = 0; i < query.length; i++) {
      query_str += query[i];
      if (i < query.length - 1) {
        query_str += ", ";
      }
    }

    query_str += " WHERE id = ?;";
    query_args.push(id);

    return self.db.run(query_str, query_args, cb);
  },
  delete_project: function (id, cb) {
    var self = this;
    return self.db.run("DELETE FROM projects WHERE id = ?;", [id], cb);
  }
})();
