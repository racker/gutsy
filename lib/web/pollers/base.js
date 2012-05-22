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

var poller = {
  init: function(api_name, poller, config){
    var self = this;
    self.__api_name = api_name;
    self.__poller = poller;
    self.__data = null;
    self.__config = config;
    self.__err = null;
  },
  set_data: function(err, data){
    var self = this;

    if (err) {
      self.__err = err;
      console.error(err);
    }

    if (data !== undefined){
      self.__data = data;
    } else{
      self.__data = null;
    }

    self.__last_updated = new Date();
  },
  get_data: function(){
    var self = this;
    return self.__data;
  },
  get_err: function(){
    var self = this;
    return self.__err;
  },
  get_config: function(){
    var self = this;
    return self.__config;
  },
  poll: function () {
    var self = this;
    self.__poller(self);
  }
};

var Poller = utils.make_class(poller);
Object.freeze(Poller);

exports.Poller = Poller;
