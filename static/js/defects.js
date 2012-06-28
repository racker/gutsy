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
  if (burndown_data){
      $.each(burndown_data, function (scope, data) {
        $.each(data, function (asset_type, assets) {
          var div_id;
          var scope_name = scope.replace(/\W/g, "-").toLowerCase();
          select_options[scope_name] = scope;
          div_id = asset_type + "-chart-" + scope_name;
          $("#charts").append("<div id='" + div_id +"' class='burndown-chart " + scope_name + "-chart'></div>");
          make_chart(asset_type, scope, assets, div_id);
        });
      });
      for (var key in select_options) {
        var option = $("<option value='" + key + "'>" + select_options[key] + "</option>");
        if (key === "total") {
          option.attr("selected", "selected");
        }
        $("#scope-picker").append(option);
      }
      $("#scope-picker").append("<option value='burndown'>Show all</option>");
      $("#scope-picker").change(function (event) {
        $(".burndown-chart").hide();
        $("." + $(this).val() + "-chart").show();
      });
    }

    $("#charts").children(".bucket").css("cursor", "pointer").click(function () {
      $(this).next().toggle();
      $(this).children(".arrow").each(toggle_arrows);
    });
  }

});