/**
 * Add timeline to top of dashboard if event data is present.
 * The numbers indicate remaining days.
 * Red numbers indicate close deadlines.
 * Clicking on the numbers displays all event information.
 */
$(document).ready(function() {
  var collapsed = "\u25B6";
  var expanded = "\u25BC";
  $(".bucket").css("cursor", "pointer").click(function () {
    $(this).next().children().each(function() {
      $(this).toggle();
    });
    $(this).children(".arrow").each(function() {
      if ($(this).text() === collapsed) {
        $(this).text(expanded);
      } else {
        $(this).text(collapsed);
      }
    });
  });
  $(".title").css("cursor", "pointer").click(function () {
    $(this).children(".arrow").each(function() {
      var arrows = $(this).parent().next().children().children(".arrow");
      var tables = $(this).parent().next().children(".table").children();
      if ($(this).text() === collapsed) {
        tables.show();
        arrows.text(expanded);
        $(this).text(expanded);
      } else {
        tables.hide();
        arrows.text(collapsed);
        $(this).text(collapsed);
      }
    });
  });
});
