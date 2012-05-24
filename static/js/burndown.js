// Load the Visualization API and the piechart package.
google.load('visualization', '1.0', {'packages':['corechart']});

// Set a callback to run when the Google Visualization API is loaded.
google.setOnLoadCallback(drawChart);

// Callback that creates and populates a data table,
// instantiates the pie chart, passes in the data and
// draws it.
function drawChart() {

  //find max length
  var make_chart = function(title, data, location){
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
  if (burndown_data){
    console.log(burndown_data.defects);
    make_chart("Defects", burndown_data.defects, "#defects-chart");
    console.log(burndown_data.tasks);
    make_chart("Tasks", burndown_data.tasks, "#tasks-chart");
  }
}

