var http = require("http"),
    fs = require("fs");
    fixture = require("../../fixtures/devops.json");

// Grabs current on call rotation from PagerDuty
// http://www.pagerduty.com/docs/rest-api/schedules
//   "pager_duty": {
//      "subdomain": "example",
//      "schedule_id": "AABBCCD",
//      "auth": "user:pass",


// PagerDuty requires the date range for all requests.
var now = new Date();
var tomorrow = new Date();
tomorrow.setDate(now.getDate() + 1 );
now = now.toISOString().split("T")[0];
tomorrow = tomorrow.toISOString().split("T")[0];

var options = {
    port: "80",
    host: fixture.related_apis.pager_duty.subdomain+".pagerduty.com",
    path: "/api/v1/schedules/"+fixture.related_apis.pager_duty.schedule_id+"/entries?since="+now+"&until="+tomorrow,
    method: "GET",
    auth: fixture.related_apis.pager_duty.auth,
    headers: {
        'Content-Type': 'application/json',
    }
};

var filename = "pagerduty.json";

// retrieve devops.json and save it to a file
exports.run = function() {
    console.log(options);
  var req = http.get(options, function(res) {
    var data = '';
    res.setEncoding('utf8');
    res.on('data', function(d) {
        data += d;
        });
    res.on('end', function() {
        fs.writeFile(filename, data, function (err) {
            if (err) throw err;
            console.log("done");
            });
        });
    }).on('error', function(e) {
        console.error('Problem with request: ' + e.message);
        console.error('Cache NOT written to.');
    });
};

exports.run();



