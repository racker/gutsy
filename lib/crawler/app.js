var http = require("http"),
    fs = require("fs"),
    settings = require("../../settings");

var options = {
    host: settings.host,
    port: settings.port,
    path: settings.path,
    method: "GET",
    headers: {
        'Content-Type': 'application/json',
    }
};

var filename = settings.filename;

// retrieve devops.json and save it to a file
exports.run = function() {
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
}
