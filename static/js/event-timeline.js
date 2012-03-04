/**
 * Add timeline to top of dashboard if event data is present.
 * The numbers indicate remaining days.
 * Red numbers indicate close deadlines.
 * Clicking on the numbers displays all event information.
 */
$(document).ready(function() {
  // list of {name:'', description:'', timestamp: converted to milliseconds!}
  // includes event representing "now".
  var events = [];
  // timestampless events
  var announcements = [];
  var now = (new Date()).getTime();
  var max = 0;
  events = [{
    timestamp: now,
    name: "now",
    description: ""
  }];
  $("#events li").each(function(idx, el) {
    var event = $(this);
    var timestamp = $(this).children(".timestamp").text();
    var name = $(this).children(".name").text();
    var description = $(this).children(".description").text();
    if (timestamp) {
      timestamp = parseInt(timestamp) * 1000;
      if (max < timestamp) { max = timestamp; }
      events.push({
        timestamp: timestamp,
        name: name,
        description: description
      });
    } else {
      announcements.push({
        timestamp: timestamp,
        name: name,
        description: description
      });
    }
  });
  if (events.length > 1) {
    events.sort(function(x,y) {
      return y.timestamp < x.timestamp;
      });
    var timeline = $("#timeline");
    var elwidth = 100;
    var width = timeline.width();
    for (var i = 0; i < events.length; i++) {
      var event = events[i];
      if (event.timestamp >= now) {
        var days_remaining = Math.floor((event.timestamp - now) / (1000*60*60*24));
        // figure out the amount and offset from the right 100px and from the left 25px
        var amt = ((event.timestamp - now) / (max - now)) * (width - 100) + 25;
        var pct = amt / width * 100;
        var el = $("<div></div>");
        el.css("left", pct+"%");
        el.css("position", "absolute");
        el.css("cursor", "pointer");
        if (event.timestamp !== now && days_remaining < 22) {
          el.css("color", "red");
        }
        el.text(days_remaining);

        var tooltip = $(["<div class=\"alert hide\">",
                         "<p class=\"tooltip-name\">",
                         event.name,
                         "</p>",
                         "<span class=\"tooltip-description\">",
                         event.description,
                         "</span>",
                         "<span class=\"tooltip-timestamp\">",
                         days_remaining,
                         " days left - ",
                         (new Date(event.timestamp)).toDateString(),
                         "</span>",
                         "</div>"].join(""));
        el.append(tooltip);
        el.click(function() {
          $(this).children().toggle();
        });
        timeline.append(el);
      }
    }
    timeline.css("margin-top", "-15px");
    timeline.css("height", "20px");
  }
});
