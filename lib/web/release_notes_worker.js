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

var async = require('async');
var _ = require('underscore');
var et = require('elementtree');

var utils = require('../utils');

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
  set_href: function(href){
    var self = this;
    self.v1.href = href;
  },
  set_error: function(err){
    var self = this;
    self.v1.error = err;
  },
  set_v1_type: function(type){
    var self = this;
    self.v1_type = type == 'B' ? "Defect" : "Feature";
  },
  set_create_date: function(date){
    var self = this;
    self.v1.date = new Date(date);
  }
});

module.exports = utils.make_class({
  init: function(v1_config, github_config, start, end){
    var self = this;

    self.notes = [];
    self._start = start;
    self._end = end;
    self.cb = null;

    self._cutoff = new Date(self._end.valueOf() - 31 * 24 * 60 *60 * 1000);

    self.v1_support = v1_config ? true : false;

    self._github_options = _.bind(utils.github_request_options, null, github_config);
    self._v1_options = _.bind(utils.get_v1_options_from_branch_name, null, v1_config);

    self.v1_response_handler = _.bind(self.__v1_response_handler, self);
    self.github_response_handler = _.bind(self.__github_response_handler, self);

    // a queue to grab info from v1 (after we get info from github :(
    // make an async queue for requests of concurrency: 5
    self._q = async.queue(function(task, cb){
      // this shit is here because we want to end when we are done processing data,
      // not sending off requests
      utils.request_maker(task.options, function(err, res){
        // this is synchronous so its ok
        task.cb(err, res);
        // alert the queue
        cb();
      });
    }, 5);
  },
  work: function(cb){
    var self = this;
    self.cb = cb;

    // cb is called after we are all done
    self._q.drain = function(err){

      self.notes.sort(function(a, b){
        return ( b.merged_at.valueOf() - a.merged_at.valueOf());
      });

      cb(err, self.notes);
    };
    // and .... go!
    self.q_github_request();
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
  q_github_request: function(uri){
    var self = this;
    var options = self._github_options(uri);

    self._q.push({options: options, cb:self.github_response_handler});
  },
  _q_v1_request: function(note){
    var self = this;

    var options = self._v1_options(note.title, "CreateDate,Description");

    if (!options){
      return;
    }

    note.set_v1_type(options.__v1_type);
    self._q.push({options: options, cb: function(err, results){
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

    etree = et.parse(results.data);

    if (etree.getroot().tag === 'Error'){
      _.each(etree.getroot().findall('./Exception'), function(tag){
        v1_error += " " + tag.getchildren()[0].text;
      });
      note.set_error(v1_error);
      return;
    }

    asset = etree.getroot().find('./Asset');
    _.each(asset.getchildren(), function(tag){
      if (tag.attrib.name === "Description"){
        note.set_data(tag.text);
      }else if (tag.attrib.name === "CreateDate"){
        note.set_create_date(tag.text);
      }
    });

    note.set_href(asset.attrib.href);
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

    next = null;

    if (errors) {
      return self.cb(errors);
    }

    try{
      res = results.res;
      pulls = JSON.parse(results.data);
    } catch (e){
      return self.cb(e);
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
        var rel_position, rel;
        uri = link.match(/<(.+?)>/)[1];
        rel = link.match(/rel="(.+?)"/)[1];
        if (rel === "next"){
          self.q_github_request(uri);
        }
      });
    }
  }
});
