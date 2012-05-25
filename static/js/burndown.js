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
    var title = asset_type + " " + scope;
    var options = {
      title: title,
      width: 550,
      height: 350,
      hAxis: {
        title: 'days into sprint'
      },vAxis: {
        title: 'points'
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

  if (burndown_data){
    $.each(burndown_data, function (scope, data) {
      $.each(data, function (asset_type, assets) {
        var div_id;
        var scope_name = scope.replace(/\W/g, "-").toLowerCase();
        var arrow_html = "<h2 class='bucket' style='cursor: pointer;'><span class='arrow'>▶</span>" + asset_type + " " + scope + "</h2>";
        div_id = asset_type + "-chart-" + scope_name;
        $("#charts").append(arrow_html + "<div id='" + div_id +"' class='burndown-chart " + scope_name + "-chart'></div>");
        make_chart(asset_type, scope, assets, div_id);
      });
    });
  }

  $("#charts").children(".bucket").css("cursor", "pointer").click(function () {
    $(this).next().toggle();
    $(this).children(".arrow").each(toggle_arrows);
  });
}

