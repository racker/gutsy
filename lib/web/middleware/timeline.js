var utils = require('../../utils');
var _ = require('underscore');

module.exports = utils.create_middleware('timeline', function timeline (req, res, next, payload) {

  // blank credentials test.
  if (req.devops.events === undefined ) {
    payload = null;
    next();
    return;
  }
  var events = req.devops.events;
  var max = 0;

  var now = (new Date()).getTime();
  var future_events = [];
  var amt;

  // define the position of the events
  try {

    for (var i=0; i<events.length; i++){
      var event = events[i];
      if (_.isNull(event.timestamp)){
        continue;
      }

      // accept both ISO and unix timestamp formats
      if (typeof (event.timestamp) === 'number') {
        event.timestamp = new Date(event.timestamp * 1000);
      } else {
        event.timestamp = new Date(event.timestamp);
      }
      
      // get max
      if (event.timestamp > max){
        max = event.timestamp;
      }
      // make valid events list
      if (event.timestamp > now){
        future_events.push(event);
      }
    }
    if (future_events.length > 1) {
      future_events.sort(function(x,y) {
        return y.timestamp < x.timestamp;
      });
    }
    _.each(future_events, function(event){
      event.days_remaining = Math.floor((event.timestamp - now) / (1000*60*60*24));
      // figure out the amount and offset from the right 100px and from the left 25px
      amt = ((event.timestamp - now) / (max - now + 1)) * 0.8;
      event.position = amt * 100;
    });
  } catch(e) {
    payload.error = e;
    return next();
  }
  payload.data = {"events": future_events};
  next();
});