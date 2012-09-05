$(document).ready(function(){
  //var nodes = [{"name": "a", "color": "#ff2299"}, {"name": "b", "color": "#9922ff"}, {"name": "c", "color": "#ff1122"}];
  //var edges = [{"source": 0, "target": 1, "value": 8}];

var w = 900, h = vertexes.length * 220;

// var force = d3.layout.force()
//   .nodes(d3.values([]))
//   .links([])
//   .size([w, h])
//   .linkDistance(150)
//   .charge(-600)
//   .on("tick", tick)
//   .start();

var svg = d3.select("#chart").append("svg:svg")
  .attr("width", "100%")
  .attr("height", h)
  .style("padding", "20px");

var y = d3.scale.ordinal()
  .domain(vertexes)
  .rangeBands([0, h]);

var x = 0;

var vertex_group = svg.append("g");
var vertex_h = 220;
var vertex_w = 360;

//plot the team logos along the x-axis
vertex_group.selectAll("text")
  .data(vertexes)
  .enter()
  .append("text")
  .text(String)
  .attr("dy", ".5em")
  .style("fill", '#333')
  .attr("y", y)
  .attr("x", x)
  .attr("width", vertex_w)
  .attr("height", vertex_h);
  //.attr("xlink:href",function(d, i) { return edges[i];} );
  //fades out all other trades, except for ones involving this team
  // .on("mouseover", fade(0.1,teams))
  // //brings all the faded out trades back to normal opacity
  // .on("mouseout", fade(1,teams));

var arcGroup = svg.append("g");
//draw the arcs from one team to the other
//to represent a trade
arcGroup.selectAll("path")
  .data(edges)
  .enter().append("path")
  .attr("d",function(d, i){
    var rx, ry, x = vertex_w+30;
    //swap the values if neccessary
    var proj_a_y = y(d[0]);
    var proj_b_y = y(d[1]);
    if(proj_a_y > proj_b_y){
    y1 = proj_a_y;
    y2 = proj_b_y;
    }
    else{
    y1 = proj_b_y;
    y2 = proj_a_y;
    }
    //start the arc at the middle of the logo
    y1 = y1;
    y2 = y2;
    //qick calculation for the arc. The closer the
    //teams are to each other (on the axis), the
    //smaller the radii need to be
    val = (y2 - y1)/2;
    rx = val;
    ry = val;

    return "M" + x + "," + y1 + " A "+ rx + "," + ry +" 0 0 0 " + x + "," + y2;
  })
  .attr("stroke", function(d,i){ return "#000";})
  //set the line thickness based on the 'size' of the trade.
  //the more players/picks exchanged, the thicker the line
  .attr("stroke-width","15px")
  .attr("fill","none");
  //on click, update the view model
});

