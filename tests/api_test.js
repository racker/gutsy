var utils = require('utils');
var settings = require('settings');
var fs = require('fs');
var path = require('path');
var _ = require('underscore');

var sample_flush_payload = {"reach":{"asdf":{"services":{"a":{"health":0,"service":"asdf","timestamp":1333651513}},"timestamp":1333651513,"health":1,"name":"asdf"},"badfb78b":{"services":{"asdfasdfasdfa":{"health":0,"service":"asdf","timestamp":1333753217175}},"timestamp":1333753217175,"health":2,"name":"badfb78b"}}};
var sample_post_payload = {"timestamp":1333753217175,"health":2,"name":"badfb78b", "services":
	{"asdfasdfasdfa":{"health":0,"service":"asdf"}}};

exports.test_api = function(test, assert){
	var api_cache, data;
	var file_path = path.join(__dirname, '../lib/', settings.testing_flush_file_path);
	try{
		fs.unlinkSync(file_path);
	} catch(e){}
	fs.writeFileSync(file_path, JSON.stringify(sample_flush_payload));
	api_cache = new utils.api_cache();
	assert.isDefined(api_cache._projects["reach"]);
	api_cache._flush_data(function(){
		data = JSON.parse(fs.readFileSync(file_path));
		assert.ok(_.isEqual(data,sample_flush_payload));
		api_cache.handle_push("reach", sample_post_payload);
		test.finish();
	});
};