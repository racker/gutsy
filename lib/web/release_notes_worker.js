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
var et = require('elementtree');

var utils = require('../utils');


var get_v1_options_from_branch_name = function(v1_config, v1_story_info, selection){
  var options, path, v1_spec, identifier;

  if (!selection){
    selection = "Description";
  }

  path = ['/',
    v1_config.name,
    "/rest-1.v1/Data/",
    v1_story_info.long_name,
    util.format("?sel=%s&where=Number='%s'", selection, v1_story_info.number)
  ];

  return {
    port: v1_config.port,
    host: v1_config.host,
    path: encodeURI(path.join("")),
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + new Buffer(v1_config.auth).toString('base64')
    }
  };
};

var Note = utils.make_class({
  init: function(pull_request){
    var self = this;
    self.title = pull_request.title;
    self.body = pull_request.body;
    self.link = pull_request.html_url;
    self.merged_at = new Date(pull_request.merged_at);
    self.id = pull_request.id;
    self.v1 = {
      data: null,
      href: null,
      error: null,
      date: null
    };
    self.v1_type = null;
  },
  set_data: function(data){
    var self = this;
    self.v1.data = data;
  },
  set_v1_href: function(href){
    var self = this;
    self.v1.href = href;
  },
  set_error: function(err){
    var self = this;
    self.v1.error = err;
  },
  set_v1_type: function(type){
    var self = this;
    self.v1_type = type === 'B' ? "Defect" : "Feature";
  },
  set_create_date: function(date){
    var self = this;
    self.v1.date = new Date(date);
  },
  get_v1_href: function(){
    var self = this;
    return self.v1.href;
  },
  get_github_href: function(){
    var self = this;
    return self.link;
  }
});

module.exports = utils.make_class({
  init: function(polling_data, start, end){
    var self = this;

    var github_commit_task_cb, __worker;

    var v1_config = polling_data.version_one.config;
    var github_config = polling_data.github.config;
    var dreadnot_config = polling_data.dreadnot.config;

    self.latest_commit = null;

    self.notes = [];
    self._start = start;
    self._end = end;
    self.cb = null;
    self.v1_config = v1_config;
    self.github_commit_task = null;
    self.date_of_last_merge_before_deploy = null;

    if(dreadnot_config){
      self.github_commit_task = self._make_last_merge_task(github_config, polling_data.dreadnot.data);
    }

    self._cutoff = new Date(self._end.valueOf() - 31 * 24 * 60 *60 * 1000);

    self.v1_support = v1_config ? true : false;

    self._github_options = _.bind(utils.github_request_options, self, github_config);
    self._v1_options = _.bind(get_v1_options_from_branch_name, self, v1_config);

    self.v1_response_handler = _.bind(self.__v1_response_handler, self);
    self.github_response_handler = _.bind(self.__github_response_handler, self);

    __worker = function(task, cb){
      // we want to end when we are done processing data,
      // not sending off requests
      utils.request_maker(task.options, function(err, res){
        // this is synchronous so its ok
        task.cb(err, res);
        // alert the queue
        cb();
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

      self.notes.sort(function(a, b){
        return ( b.merged_at.valueOf() - a.merged_at.valueOf());
      });

      cb(err, {notes: self.notes, to_revision_time: self.to_revision_time});
    };
    // and .... go!
    if (self.github_commit_task){
      self._push_to_q(self.github_commit_task);
    }

    self._q_github_request();
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
      return self._die(e);
    }

    github_commit_task_cb = function(err, results){
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
        self.to_revision_time = new Date(data.commit.committer.date);
        console.log(self.to_revision_time);
      }catch(e){
        return self._die('Github says: ' + e);
      }
    };

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
      cb: github_commit_task_cb
    };
  },
  _q_github_request: function(uri){
    var self = this;
    var options = self._github_options(uri);
    self._push_to_q({options: options, cb:self.github_response_handler});
  },
  _q_v1_request: function(note){
    var self = this;
    var options;

    var v1_story_info = utils.version_one_match(note.title);
    if (!v1_story_info){
      return;
    }
    note.set_v1_type(v1_story_info.long_name);

    options = self._v1_options(v1_story_info, "CreateDate,Description");

    self._push_to_q({options: options, cb: function(err, results){
      // could use bind again, but this is clearerer
      self.v1_response_handler(note, err, results);
      }
    });
  },
  __v1_response_handler: function(note, errors, results){
    var self = this;
    var etree;
    var asset;
    var v1_error = "";

    if (errors){
      note.set_error(errors);
      return;
    }
    utils.parse_v1(results.data, function(error, asset){
      if (error){
        note.set_error(error);
        return;
      }
      asset = asset[0];
      note.set_data(asset.attributes.Description);
      note.set_create_date(asset.attributes.CreateDate);
      note.set_v1_href(utils.v1_id_to_url(self.v1_config, asset.id));
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
      if (new Date(pull.created_at) < self._cutoff){
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
