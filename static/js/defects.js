/**
 * Add timeline to top of dashboard if event data is present.
 * The numbers indicate remaining days.
 * Red numbers indicate close deadlines.
 * Clicking on the numbers displays all event information.
 */
$(document).ready(function () {
  $(".title").css("cursor", "pointer").click(function () {
    $(this).next().children().each(function () {
      $(this).toggle();
    });
    $(this).children(".arrow").each(function () {
      if ($(this).text() === "\u25B6") {
        $(this).text("\u25BC");
      } else {
        $(this).text("\u25B6");
      }
    });
  });
});

