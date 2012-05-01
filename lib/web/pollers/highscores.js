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
var util = require('util');
var utils = require('../../utils');
var async = require('async');
var url = require('url');

module.exports = _highscores;

/** Adds github field to devops if github related api is present
 * @param {object} devops devops object
 */
function _highscores(payload) {
  var api_config = payload.config;
  var options = {
    host: api_config.url,
    port: api_config.port,
    path: "/api/reach",
    method: 'GET'
   };

  utils.request_maker(options, function(err, results){
    var data;

    if (err){
      payload.error = err;
      return;
    }

    data = JSON.parse(results.data);

    var position = 1;
    var modifier  = " ";
    _.each(data, function(row){
      var place = "";
      switch (position){
        case (1):
          place = "1st"; modifier = "!!!"; break;
        case (2):
          place = "2nd"; modifier = "!!"; break;
        case (3):
          place = "3rd"; modifier = "!"; break;
        default:
          place = position.toString() + "th";
      }
      row.place = place;
      row.modifier = modifier;
      position ++;
    });

    payload.data = data;

    return;
  });
}
