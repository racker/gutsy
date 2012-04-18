var utils = require('../lib/utils');
var settings = require('../lib/settings');
var middleware = require('../lib/web/middleware');


exports.test_auth_pass = function(test, assert){
  run_test(test, assert, 'aafsdaeafe', 'afaefijafijfe', true);
};
exports.test_auth_fail_1 = function(test, assert){
  run_test(test, assert, 'aafsdaeafe', '', false);
};
exports.test_auth_fail_2 = function(test, assert){
  run_test(test, assert, 'afae', '', false);
};

function run_test(test, assert, username, password, should_succeed){
  var _valid_users = settings.valid_users;
  var mock_req;
  if (!settings.valid_users) {
    throw new Error("Define exports.valid_users = ['username', 'password'] in your settings.js");
  }
  if (should_succeed){
    settings.valid_users.push([username, password]);
  }

  mock_req = create_mock_req(username, password);
  middleware.basic_auth(mock_req, create_mock_res(function(){
    // this means we failed to auth
    if (should_succeed){
      assert.ok(false, 'Didn\'t auth when we should have');
    }else{
      assert.ok(true);
    }
    settings.valid_users = _valid_users;
    return test.finish();
  }), function(){
    // this means we suceeded
    console.log('asdf');
    if (should_succeed){
      assert.ok(true);
    }else{
      assert.ok(false, 'Authed when we shouldn\'t have');
    }
    settings.valid_users = _valid_users;
    return test.finish();
  });
  settings.valid_users = _valid_users;
}

function create_mock_req(username, password){
  return {
    header: function(header_name){
      if (header_name === 'Authorization'){
        return utils.create_basic_auth(username, password);
      }
  }};
}

function create_mock_res(cb){
  return {
    // only called when there is a failure
    send: function(){
      cb();
    }
  };
}
