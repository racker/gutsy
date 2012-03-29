
var settings = require('settings');
var middleware = require('web/middleware');

exports.test_trace_with_debug = function(test, assert) {
  var err = gen_error();
  var output = run_test('trace', err, true);
  assert.notEqual(output, err.message);
  assert.ok(output.search('<br/>')>0);
  test.finish();
};

exports.test_trace_without_debug = function(test, assert) {
  var err = gen_error();
  var output = run_test('trace', err, false);
  //This test is stupid, but for the life of me I can't figure out a valid comparison
  assert.equal(output.length-2, err.message.length, "Should not get a stacktrace and did I think?");
  test.finish();
};

function run_test(function_name, args, debug){
  var fn = middleware.injector.jade_locals({params: null}, {})[function_name];
  var inital_debug_setting = settings.debug;
  var output = null;
  settings.debug = debug;
  try{
    output = fn(args);
  }finally{
    settings.debug = inital_debug_setting;
    return output;
  }
}

function gen_error(){
  var e = null;
  try{
    var error = new Error('hello');
    throw(error);
  }catch(e){
    return e;
  }
}