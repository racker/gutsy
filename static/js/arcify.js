$(document).ready(function(){
  //var nodes = [{"name": "a", "color": "#ff2299"}, {"name": "b", "color": "#9922ff"}, {"name": "c", "color": "#ff1122"}];
  //var edges = [{"source": 0, "target": 1, "value": 8}];

/*jshint multistr:true */
var template =  _.template('\
  <h2>\
    <a href="/p/<%= name %>", title="<%= tags %>"> <%= name %> </a>\
  </h2>\
  <h4> <%= description %> </h4>');
 // <h6 class="tags"><% tags.join(", "").toLowerCase() %> </h6> ');
var in_out_offset = 15;
var vertex_h = 80;
var vertex_w = 360;
var w = 900, h = vertexes.length * vertex_h;
var colors = ["#DF5ECA", "#333", "#00E0FF", "#F5FF0D", "#848B87"];

// var force = d3.layout.force()
//   .nodes(d3.values([]))
//   .links([])
//   .size([w, h])
//   .linkDistance(150)
//   .charge(-600)
//   .on("tick", tick)
//   .start();

var svg = d3.select("#arc").append("svg:svg")
  .attr("width", "100%")
  .attr("height", h)
  .style("padding", "20px");

var y = d3.scale.ordinal()
  .domain(vertexes)
  .rangeBands([0, h], 0.05);

var x = 0;

var vertex_group = svg.append("g");

//plot the team logos along the x-axis
vertex_group.selectAll("foreignObject")
  .data(vertexes)
  .enter()
  .append("foreignObject")
  .attr("y", y)
  .attr("x", x)
  .attr("width", vertex_w)
  .attr("height", vertex_h)
  .append("xhtml:body")
    .attr("width", "100%")
    .attr("height", "100%")
    .style("border", function(d){
      var color;
      if (linked_vertexes.indexOf(d) < 0){
        color = "";
      } else {
        color = colors[d % colors.length ];
      }

      return "5px solid " + color;
    })
    .style("border-radius", "10px")
    .style('padding', "5px")
    .attr("xmlns", "http://www.w3.org/1999/xhtml")
    .html(function(d){
      // move over the rendered elements into our foreign object
      return template(projects[d]);
    });
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
    var rx, ry, x = vertex_w;
    //swap the values if neccessary
    var proj_a_y = y(d[0]);
    var proj_b_y = y(d[1]);
    if(proj_a_y > proj_b_y){
    y1 = proj_a_y - in_out_offset;
    y2 = proj_b_y + in_out_offset;
    }
    else{
    y1 = proj_b_y + in_out_offset;
    y2 = proj_a_y - in_out_offset;
    }
    //start the arc at the middle of the boxes
    y1 = y1 + vertex_h / 2;
    y2 = y2 + vertex_h / 2;

    rx = ry = (y2 - y1)/2;

    return "M" + x + "," + y1 + " A "+ rx + "," + ry +" 0 0 0 " + x + "," + y2;
  })
  .attr("stroke", function(d,i){
    return colors[d[0] % colors.length ];
  })
  //set the line thickness based on the 'size' of the trade.
  //the more players/picks exchanged, the thicker the line
  .attr("stroke-width","5px")
  .attr("fill","none");
  //on click, update the view model
});

