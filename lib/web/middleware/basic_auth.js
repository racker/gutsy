var settings = require('../../settings');

module.exports = function basic_auth(req, res, next){
  var username, password, auth_token, index_of_colon, auth_header, i, user_tuple;
  try{
    auth_header = req.header('Authorization');

    if (auth_header === undefined){
      return unauthorized(res);
    }
    if (auth_header.slice(0, 6) !== "Basic "){
      return unauthorized(res);
    }
    auth_token = auth_header.slice(6);
    if (auth_token === ""){
      return unauthorized(res);
    }
    auth_token = new Buffer(auth_token, "base64").toString('ascii');
    index_of_colon = auth_token.indexOf(':');
    if (index_of_colon === -1){
      return unauthorized(res);
    }
    username = auth_token.slice(0, index_of_colon);
    password = auth_token.slice(index_of_colon+1);
    if (username === "" || password === ""){
      return unauthorized(res);
    }

    for (i=0; i<settings.valid_users.length; i++){
      user_tuple = settings.valid_users[i];
      if(username === user_tuple[0] && password === user_tuple[1]){
        return next();
      }
    }

  }catch (e){
    return unauthorized(res);
  }
  return unauthorized(res);
};

var unauthorized = function(res){
  return res.send('Authorization required.', 401);
};