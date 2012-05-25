// Load the Visualization API and the piechart package.
google.load('visualization', '1.0', {'packages':['corechart']});

// Set a callback to run when the Google Visualization API is loaded.
google.setOnLoadCallback(drawChart);

// Callback that creates and populates a data table,
// instantiates the pie chart, passes in the data and
// draws it.
function drawChart() {
  //find max length
  var make_chart = function(asset_type, scope, data, location){
    var chart = [];
    var last_value = [];
    var i;
    var max = 0;
    var _chart;
    var title = scope + " " + asset_type;
    var options = {
      title: title,
      width: 550,
      height: 350,
      hAxis: {
        title: 'days into sprint'
      },vAxis: {
        title: 'points'
      },
      series: {
        "Iteration 21": {"color": "black"},
        "Iteration 22": {"color": "black"},
        "Iteration 23": {"color": "black"}
      }
    };

    $.each(data, function(sprint, values){
      if (values.length > max){
        max = values.length;
      }
    });

    if (max <= 0) {
      return;
    }
    //push arrays onto charts
    i = max -1;
    while (i>=0){
      chart[i] = [i];
      i -=1;
    }
    // push data
    chart[0] = ['Day'];
    $.each(data, function(sprint, values){
      var value = 0;
      chart[0].push(sprint);
      for (i =1; i < max; i++){
        if (values[i]){
          value = values[i];
        }
        chart[i].push(value);
      }
    });
    // Instantiate and draw our chart, passing in some options.
    _chart = new google.visualization.LineChart($("#" + location)[0]);
    _chart.draw(google.visualization.arrayToDataTable(chart), options);
  };

  var select_options = {};
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
      $("#graph-picker").append(option);
    }
    $("#graph-picker").append("<option value='burndown'>Show all</option>");
    $("#graph-picker").change(function (event) {
      $(".burndown-chart").hide();
      $("." + $(this).val() + "-chart").show();
    });
  }

  $("#charts").children(".bucket").css("cursor", "pointer").click(function () {
    $(this).next().toggle();
    $(this).children(".arrow").each(toggle_arrows);
  });
}

