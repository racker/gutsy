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

var utils = require('../../utils');


var mixin = {
  init: function(payload){
      this.payload = payload;
      this.api_config = payload.config;
    },
  poll_interval: 10 * 60 * 1000,
  poll: function poll(delay){
    var self = this;
    var callback = _.bind(self.poll, self);
    var poller = _.bind(self.__poll, self);
    delay = delay !== undefined ? delay : self.poll_interval;
    self.timeout_id = setTimeout(poller, delay, callback);
  }
};

exports.make_poller = function(poller){
  _.defaults(poller, mixin);
  return utils.make_class(poller);
};