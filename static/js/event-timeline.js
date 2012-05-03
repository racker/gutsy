/**
 * Add timeline to top of dashboard if event data is present.
 * The numbers indicate remaining days.
 * Red numbers indicate close deadlines.
 * Clicking on the numbers displays all event information.
 */
$(document).ready(function () {
  // list of {name:'', description:'', timestamp: converted to milliseconds!}
  // includes event representing "now".
  var events = [];
  var now = (new Date()).getTime();
  var max = 0;
  events = [{
    timestamp: now,
    name: "now",
    description: ""
  }];
  $("#events li").each(function (idx, el) {
    var event = $(this);
    var timestamp = $(this).children(".timestamp").text();
    var name = $(this).children(".name");
    var description = $(this).children(".description");
    var related_links = $(this).children(".related_links");
    if (timestamp) {
      timestamp = parseInt(timestamp) * 1000;
      if (timestamp > now) {
        if (max < timestamp) { max = timestamp; }
        events.push({
          timestamp: timestamp,
          name: name,
          description: description,
          related_links: related_links
        });
      }
    }
  });
  if (events.length > 1) {
    events.sort(function (x,y) {
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

        var tooltip = $("<div></div>").addClass("alert hide timeline-tooltip");
        tooltip.append(event.name);
        tooltip.append(event.description);
        tooltip.append(event.related_links);
        tooltip.append($("<span></span>").addClass("date-info").append([
            days_remaining,
            " days left - ",
            (new Date(event.timestamp)).toDateString()].join("")));
        el.append(tooltip);
        el.click(function () {
          $(this).children().toggle();
        });
        timeline.append(el);
      }
    }
    timeline.css("margin-top", "-15px");
    timeline.css("height", "20px");
    var events = $("#events");
    events.prev().detach();
    events.detach();
  }
});
