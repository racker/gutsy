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
var url = require('url');

var async = require('async');
var _ = require('underscore');

var log = require('../../log');
var utils = require('../../utils').common;
var v1 = require('../../utils').v1;
var notes = require('./notes');

var Note = notes.Note;

module.exports = utils.make_class({
  init: function(polling_data, start, end){
    var self = this;

    var __worker;

    var v1_config = polling_data.version_one ? polling_data.version_one.get_config() : undefined;
    var github_config = polling_data.github.get_config();
    var dreadnot_config = polling_data.dreadnot ? polling_data.dreadnot.get_config() : undefined;

    self.latest_commit = undefined;

    self.v1_data = {};
    self.notes = [];
    self._start = start;
    self._end = end;
    self.cb = undefined;
    self.v1_config = v1_config;
    self.github_commit_task = undefined;
    self.date_of_last_merge_before_deploy = undefined;
    // this is really the time of the commit for the last pr merged into master that was deployed-
    // slightly different than the merged_at time.
    self.last_pr_commit_to_live_time = undefined;
    self.last_merged_sha = undefined;

    if(dreadnot_config){
      self.github_commit_task = self._make_last_merge_task(github_config, polling_data.dreadnot.get_data());
    }

    self._cutoff = new Date(self._end.valueOf() - 31 * 24 * 60 *60 * 1000).valueOf();

    self.v1_support = v1_config ? true : false;

    self._github_options = _.bind(utils.github_request_options, self, github_config);
    self._v1_options = _.bind(v1.get_options_from_branch_name, self, v1_config);

    self.v1_response_handler = _.bind(self.__v1_response_handler, self);
    self.github_response_handler = _.bind(self.__github_response_handler, self);

    __worker = function(task, cb){
      // we want to end when we are done processing data,
      // not sending off requests
      utils.request_maker(task.options, function(err, res){
        // this is synchronous so its ok
        try{
          task.cb(err, res);
        }catch(e){
          log.error(e);
        }finally{
          // alert the queue
          cb();
        }
      });
    };

    // a queue to grab info from v1 (after we get info from github :(
    self._q = async.queue(__worker, 10);

  },
  work: function(cb){
    var self = this;
    var options;
    self.cb = cb;

    // cb is called after we are all done
    self._q.drain = function(err){

      _.each(self.notes, function(note){
        if (note.v1.id !== undefined){
          var split = note.v1.id.split(':');
          var type = split[0];
          var id = split[1];
          delete self.v1_data[type][id];
        }
      });

      _.each(self.v1_data, function(assets, type){
        _.each(assets, function(asset, id){
          var new_note;
          new_note = new Note();
          new_note.set_v1(asset);
          self.notes.push(new_note);
        });
      });

      self.notes.sort(function(a, b){
        var a_time = a.merged_at || a.v1.change_date;
        var b_time = b.merged_at || b.v1.change_date;

        return ( b_time.valueOf() - a_time.valueOf() );
      });

      cb(err, {notes: self.notes,
        to_revision_time: self.last_pr_commit_to_live_time,
        last_merged_sha: self.last_merged_sha,
        pr_id: self.pr_id});
    };
    // and .... go!
    if (self.github_commit_task){
      self._push_to_q(self.github_commit_task);
    }

    self._q_github_request();
    self._get_v1_history();
  },
  _history_handler: function(type, err, results){
    var self = this;
    self.v1_data[type] = {};
    v1.parse(results.data, function(err, assets){
      _.each(assets, function(asset){
        if (v1.asset_is_open(asset) === true){
          return;
        }
        var name = asset.id.split(":")[1];
        var asset_history = self.v1_data[type][name];
        if (asset_history === undefined){
          self.v1_data[type][name] = asset;
          return;
        }
        if (Date.parse(asset.ChangeDate) < Date.parse(asset_history.ChangeDate)){
          self.v1_data[type][name] = asset;
        }
      });
    });
  },
  _get_v1_history: function(){
    var self = this;

    if (!self.v1_support){
      return;
    }
    _.each(['Story', 'Defect'], function(type){
      var options = v1.get_history_options(self.v1_config, self._start, self._end, type);
      console.log(options.path);
      self._push_to_q({options: options, cb: _.bind(self._history_handler, self, type)});
    });
  },
  add_note: function(pull_request){
    var self = this;
    var note = new Note(pull_request);

    self.notes.push(note);

    if (self.v1_support){
      self._q_v1_request(note);
    }
    return note;
  },
  _push_to_q: function(task){
    var self = this;
    if(!self._q){
      return;
    }
    self._q.push(task);
  },
  _die: function(err){
    var self = this;
    self.cb(err);
    delete self._q;
  },
  _make_last_merge_task: function(github_config, dread_data){
    var self = this;
    var sha;

    if (!dread_data){
      return;
    }
    try{
      sha = dread_data[0].deploy.to_revision;
    }catch(e){
      return;
    }
    self.last_merged_sha = sha;

    return {
      options: {
        return_response: true,
        host: url.parse(github_config.url).host,
        port: 443,
        path: util.format('/repos/%s/%s/commits/%s', github_config.org, github_config.repo, sha),
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': utils.create_basic_auth(github_config.username,
            github_config.apikey)
          }
      },
      cb: _.bind(self.github_sha_getter_cb, self)
    };
  },
  github_sha_getter_cb: function(err, results){
    var self = this;
    var data;
    var error;

    if (err){
      return self._die(err);
    }
    try{
      data = JSON.parse(results.data);
    }catch(e){
      return self._die(e);
    }
    if (data.message){
      return self._die('Github says: ' + data.message);
    }

    try{
      self.last_pr_commit_to_live_time = new Date(data.commit.committer.date);
      log.log(self.last_pr_commit_to_live_time);
      self.pr_id = data.id;
    }catch(e){
      return self._die('Github says: ' + e);
    }
  },
  _q_github_request: function(uri){
    var self = this;
    var options = self._github_options(uri);
    self._push_to_q({options: options, cb: self.github_response_handler});
  },
  _q_v1_request: function(note){
    var self = this;
    var options;

    var v1_story_info = v1.match(note.title);
    if (!v1_story_info){
      return;
    }

    options = self._v1_options(v1_story_info);

    self._push_to_q({options: options, cb: function(err, results){
      // could use bind again, but this is clearerer
      self.v1_response_handler(note, err, results);
      }
    });
  },
  __v1_response_handler: function(note, errors, results){
    var self = this;
    var asset;
    var v1_error = "";

    if (errors){
      note.set_error(errors);
      return;
    }
    v1.parse(results.data, function(error, asset){
      if (error){
        note.set_error(error);
        return;
      }
      asset = asset[0];
      note.set_v1(asset);
    });
  },
  __github_response_handler: function(errors, results){
    var self = this;
    var pulls;
    var res;
    var links;
    var i;
    var pull;
    var merged_at;
    var reached_cutoff = false;

    if (errors) {
      return self._die(errors);
    }

    try{
      res = results.res;
      pulls = JSON.parse(results.data);
    } catch (e){
      return self._die(e);
    }

    if (pulls.message){
      return self._die('Github says: ' + pulls.message);
    }

    for (i=0; i<pulls.length; i++){

      pull = pulls[i];
      if (Date.parse(pull.created_at) < self._cutoff){
        reached_cutoff = true;
      }
      if (!pull.merged_at){
        continue;
      }
      // TODO: check for pull.base.label === 'master'?
      merged_at = new Date(pull.merged_at);

      if (merged_at >= self._start && merged_at <= self._end){
        self.add_note(pull);
      }
    }
    // make another github request?
    if (!reached_cutoff && res.headers.link){
      _.each(res.headers.link.split(','), function(link){
        var rel_position, rel, uri;
        uri = link.match(/<(.+?)>/)[1];
        rel = link.match(/rel="(.+?)"/)[1];
        if (rel === "next"){
          self._q_github_request(uri);
        }
      });
    }
  }
});
