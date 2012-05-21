// .burndown the Visualization API and the piechart package.
google.load('visualization', '1.0', {'packages':['corechart']});

// Set a callback to run when the Google Visualization API is loaded.
google.setOnLoadCallback(drawChart);

function drawChart() {

  var churn = function(title, data, location){
    var chart = [];
    options = {
      title: title,
      width: 550,
      height:350,
      hAxis: {
        title: 'The Churn'
      },vAxis: {
        title: 'points'
      }};
    chart[0] = ['Day', 'Opened', 'Closed'];

    for(var i=0; i<data.opened.length; i++){
      chart.push([i, data.opened[i], data.closed[i]]);
    }
    // Instantiate and draw our chart, passing in some options.
    _chart = new google.visualization.LineChart($(location)[0]);
    _chart.draw(google.visualization.arrayToDataTable(chart), options);
  };
  //find max length
  var burndown = function(title, data, location){
    var chart = [];
    var options;
    var last_value = [];
    var i;
    var max = 0;
    var _chart;
    $.each(data, function(sprint, values){
      if (values.length > max){
        max = values.length;
      }
    });
    //push arrays onto charts
    i = max -1;
    while (i>=0){
      chart[i] = [i];
      i -=1;
    }
    // push data
    chart[0] = ['Day'];
    $.each(data, function(sprint, values){
      var value;
      chart[0].push(sprint);
      for (i =1; i < max; i++){
        if (values[i]){
          value = values[i];
        }
        chart[i].push(value);
      }
    });
    options = {
      title: title,
      width: 550,
      height:350,
      hAxis: {
        title: 'days into sprint'
      },vAxis: {
        title: 'points'
      }};
    // Instantiate and draw our chart, passing in some options.
    _chart = new google.visualization.LineChart($(location)[0]);
    _chart.draw(google.visualization.arrayToDataTable(chart), options);
  };
  if (burndown_data.burndown){
    burndown("Defects", burndown_data.burndown.defects, "#defects-chart");
    burndown("Tasks", burndown_data.burndown.tasks, "#tasks-chart");
  }
  if (burndown_data.churn){
    churn("Defects", burndown_data.churn.defects, '#churn-defects-chart');
    churn("Tasks", burndown_data.churn.tasks, '#churn-tasks-chart');
  }
}

