$(document).ready(function(){
  //var nodes = [{"name": "a", "color": "#ff2299"}, {"name": "b", "color": "#9922ff"}, {"name": "c", "color": "#ff1122"}];
  //var edges = [{"source": 0, "target": 1, "value": 8}];

  var _nodes = [];
  $("#hidden .node").each(function(e) {
    _nodes.push({name: $(this).children(".name").text(), color: $(this).children(".color").text()});
  });

  var _edges = [];
  $("#hidden .edge").each(function(e) {
    var children = $(this).children();
    var source = children.filter(".source").text();
    var target = children.filter(".target").text();
    if (source !== "" && target !== "") {
      _edges.push({source: parseInt(source, 10), target: parseInt(target, 10), value: 8});
    }
  });

var w = 900, h = 300;

var force = d3.layout.force()
    .nodes(d3.values(_nodes))
    .links(_edges)
    .size([w, h])
    .linkDistance(150)
    .charge(-600)
    .on("tick", tick)
    .start();

var svg = d3.select("#chart").append("svg:svg")
    .attr("width", "100%")
    .attr("height", h)
    .style("padding", "20px");

// Per-type markers, as they don't inherit styles.
svg.append("svg:defs").selectAll("marker")
    .data(["arrow"])
  .enter().append("svg:marker")
    .attr("id", String)
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 15)
    .attr("refY", -1.5)
    .attr("markerWidth", 6)
    .attr("markerHeight", 10)
    .attr("orient", "auto")
    .style("fill", "#FAA")
  .append("svg:path")
    .attr("d", "M0,-5L10,0L0,5");

var path = svg.append("svg:g").selectAll("path")
    .data(force.links())
  .enter().append("svg:path")
    .attr("class", function(d) { return "link arrow"; })
    .attr("marker-mid", function(d) { return "url(#arrow)"; });

 var node = svg.selectAll("g.node")
      .data(_nodes)
    .enter().append("svg:g")
      .attr("class", "node")
      .call(force.drag);

  var text_width = function(txt) {
    var e = $("<span>"+txt+"</span>").css("font-size", "1.5em");
    $("body").append(e)
    var width = e.width();
    e.remove();
    return width;
  };

  node.append("svg:rect")
      .attr("width", function(d) { return text_width(d.name) + 4; })
      .attr("height", "2em")
      .attr("x", function(d) {return -0.5 * (text_width(d.name) + 2); })
      .attr("y", "-1.4em")
      .style("fill", function(d) { return d.color; });

  node.append("svg:text")
      .text(function(d) { return d.name; })
      .style("font-size", "1.5em")
      .style("text-anchor", "middle");

  // Use elliptical arc path segments to doubly-encode directionality.
  function tick() {
    path.attr("d", function(d) {
      var dx = d.target.x - d.source.x,
          dy = d.target.y - d.source.y,
          dr = Math.sqrt(dx * dx + dy * dy),
          hx = d.source.x + dx/2.0;
          hy = d.source.y + dy/2.0;
      return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + hx + "," + hy + "A" + dr + "," + dr + " 0 0,0 " + d.target.x + "," + d.target.y;
    });

    node.attr("transform", function(d) {
      return "translate(" + d.x + "," + d.y + ")";
    });
  }
});

