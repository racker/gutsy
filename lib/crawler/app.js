var http = require('http'),
    https = require('https'),
    fs = require('fs'),
    settings = require('../../settings');

var request_module = https;
if (settings.protocol == 'http') {
  request_module = http;
}

var options = {
    host: settings.host,
    port: settings.port,
    path: settings.path,
    method: 'GET',
    headers: {
        'Content-Type': 'application/json'
    }
};

var filename = settings.filename;

// retrieve devops.json and save it to a file
exports.run = function() {
  var req = request_module.get(options, function(res) {
    var data = '';
    res.setEncoding('utf8');
    res.on('data', function(d) {
        data += d;
        });
    res.on('end', function() {
        fs.writeFile(filename, data, function (err) {
            if (err) throw err;
            console.log('done');
            });
        });
    }).on('error', function(e) {
        console.error('Problem with request: ' + e.message);
        console.error('Cache NOT written to.');
    });
};
