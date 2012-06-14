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

var _ = require('underscore');

var log = require('../../log');
var utils = require('../../utils').common;

var make_payload = function(poller){};

var poller = {
  default_poll_interval: 5 * 60 * 1000,
  init: function(__name, project_name, poller, config){
    var self = this;
    self.__name = __name;
    self.__poller = poller;
    self.__data = null;
    self.__config = config;
    self.__err = null;
    self.__last_poll_end = Infinity;
    self.__last_poll_start = 0;
    self.project_name = project_name;
    self.poll_interval = poller.poll_interval || self.default_poll_interval;
    self.timeout = _.max([self.poll_interval * 3, 10000]);
  },
  set_data: function(err, data, cb){
    var self = this;
    // catch everything, cb must fire!
    try{
      if (err) {
        self.__err = err;
        log.error(err);
      }

      if (data !== undefined){
        self.__data = data;
      } else{
        self.__data = null;
      }

      self.__last_poll_end = new Date().valueOf();
    }catch(e){
      log.error(e);
    }finally{
      //WARNING: don't call with error!
      cb();
    }
  },
  get_project_name: function(){
    var self = this;
    return self.project_name;
  },
  get_data: function(){
    var self = this;
    return self.__data;
  },
  get_err: function(){
    var self = this;
    return self.__err;
  },
  get_last_crawl_time: function() {
    var self = this;
    var last_crawl_time = self.__last_poll_end;
    if (last_crawl_time === Infinity) {
      return new Date(0);
    }
    return new Date(last_crawl_time);
  },
  get_config: function(api_name){
    var self = this;
    // did they ask for a specific one?
    if (api_name !== undefined){
      return self.__config[api_name];
      // is there only one?
    } else if (_.keys(self.__config).length === 1){
      return self.__config[_.keys(self.__config)[0]];
    }
    return self.__config;
  },
  _payload_factory: function(cb){
    var self = this;
    var factory = function(){};
    factory.prototype = self;

    var payload = new factory();
    payload.set_data = function(err, data){
      self.set_data(err, data, cb);
    };
    return payload;
  },
  poll: function (cb) {
    var self = this;
    var now;
    var finished_polling;
    var should_poll;
    var poll_timed_out;
    var payload;

    try{
      now = new Date().valueOf();
      finished_polling = self.__last_poll_end > self.__last_poll_start;
      should_poll = now - self.__last_poll_end >= self.poll_interval;
      poll_timed_out = now - self.__last_poll_start >= self.timeout;

      if ((should_poll && finished_polling) || poll_timed_out) {
        self.__last_poll_start = new Date().valueOf();
        payload = self._payload_factory(cb);
        self.__poller(payload);
      }
    }catch(e){
      self.set_data(e, null, cb);
    }
  }
};

var Poller = utils.make_class(poller);
Object.freeze(Poller);

exports.Poller = Poller;
