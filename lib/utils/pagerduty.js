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

var http = require("http"),
    fs = require("fs");
    fixture = require("../../fixtures/devops.json");

/*
 *  Grabs current on call rotation from PagerDuty
 *  http://www.pagerduty.com/docs/rest-api/schedules
 *   "pager_duty": {
 *      "subdomain": "example",
 *      "schedule_id": "AABBCCD",
 *      "auth": "user:pass",
 */




// retrieve devops.json and save it to a file
exports.getPagerDutyRotation = function(callback) {
    // PagerDuty requires the date range for all requests.
    var now = new Date();
    var until = new Date();
    until.setDate(now.getDate() + 4 );
    now = now.toISOString().split("T")[0];
    until = until.toISOString().split("T")[0];

    var options = {
      port: "80",
      host: fixture.related_apis.pager_duty.subdomain+".pagerduty.com",
      path: "/api/v1/schedules/"+fixture.related_apis.pager_duty.schedule_id+"/entries?since="+now+"&until="+until,
      method: "GET",
      auth: fixture.related_apis.pager_duty.auth,
      headers: {'Content-Type': 'application/json'}
    };


    req = http.get(options, function(res) {
      var data = '';
      res.setEncoding('utf8');
      res.on('data', function(d) {
          data += d;
      });
      res.on('end', function() {
        var pagerduty_json;
        try {
          pagerduty_json = JSON.parse(data);
        }
        catch (e){
          callback (e);
          return;
        }
        callback(null, pagerduty_json);
      });
    }).on('error', function(e) {
      callback(e);
    });
};




