var _ = require('underscore');
var http = require("http");
var _render = http.ServerResponse.prototype.render;
 // contains keys (urls) to {'expires_on': expires_on, 'response': null} where expires on invalidates
 // a given entry and where response is the rendered view
var __cache = {};
/**
 * Caches response rendered responses for ttl seconds.
 *
 * @param {int} expires the ttl in seconds
 */
module.exports = function cache_me(ttl){
  return function(req, res, next){
    if (req.nocking){
      return next();
    }
    // TODO: this stampedes... also, why not add a real cache out front or cache the rendered page instead?
		var now = Date.now();
    var key = req.url;

    // TODO: this is a bit unsafe because JS is crazy and the key is user input
    var cache_hit = (key && _.has(__cache, key) && now <= __cache[key].expires_on && __cache[key].response !== null );

    if (cache_hit){
      //res.header('Cache-Control', 'max-age='+
      //  (__cache[key].expires_on-now)/1000);
      res.end(__cache[key].response);
      return;
    }
    // hook up the cache if we aren't testing
    __cache[key] = {'expires_on': now + ttl * 1000, 'response': null};

    res.render = function(view, options, callback){
     var _callback = function(err, view){
        if (callback){
          // TODO: something sane here....
          callback(err, view);
        }
        if (err){
          // this calls the root template with the error (would happen if this cb weren't here)
          // Unfortunately, we don't cache errors
          return req.next(err);

        }
        __cache[key].response = view;
        //res.header('Cache-Control', 'max-age='+ttl);
        res.end(view);
      };
      _render.call(res, view, options, _callback);
    };

    next();
  };
};