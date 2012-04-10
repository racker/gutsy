/**
 * Add timeline to top of dashboard if event data is present.
 * The numbers indicate remaining days.
 * Red numbers indicate close deadlines.
 * Clicking on the numbers displays all event information.
 */
$(document).ready(function() {
  $(".title").click(function () {
    $(this).next().children().each(function() {
      $(this).toggle();
    });
  });
});

