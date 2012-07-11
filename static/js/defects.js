/**
 * Add timeline to top of dashboard if event data is present.
 * The numbers indicate remaining days.
 * Red numbers indicate close deadlines.
 * Clicking on the numbers displays all event information.
 */
var collapsed = "\u25B6";
var expanded = "\u25BC";

function toggle_arrows() {
  if ($(this).text() === collapsed) {
    $(this).text(expanded);
  } else {
    $(this).text(collapsed);
  }
}

$(document).ready(function() {
  create_defect_scope_dropdown();


  // Buckets dropdown control
  $("#defects_chart").children(".bucket").css("cursor", "pointer").click(function () {
    $(this).next().children().each(function() {
      $(this).toggle();
    });
    $(this).children(".arrow").each(toggle_arrows);
  });
  // All Buckets dorpdown control
  $("#defects_title").css("cursor", "pointer").click(function () {
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

function create_defect_scope_dropdown() {
  var select_options = {};
  if (burndown_data){
    $.each(burndown_data, function (scope, data) {
      select_options[scope] = data.Name;
    });
    for (var key in select_options) {
      var option = $("<option value='" + key + "'>" + select_options[key] + "</option>");
      if (key !== "Total"){
        $("#scope-picker").append(option);
      }
    }
  }
}

});