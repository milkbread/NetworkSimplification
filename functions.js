// Collapse the quadtree into an array of rectangles.
function nodes(quadtree) {
  var nodes = [];
  quadtree.visit(function(node, x1, y1, x2, y2) {
    nodes.push({x: x1, y: y1, width: x2 - x1, height: y2 - y1});
  });
  return nodes;
}

function transformGroup() {
	// Transform all groups
	groups.forEach(function(group) {
		group.group.attr("transform", function(d){
			return "scale("+groupScale+", -"+groupScale+") translate("+groupPositionX+",-" + ((height - 10) + groupPositionY) + ")"; });
	})
	// Re-Scale size of points and lines
	rectangles.style("stroke-width", .1 / groupScale);
	points.attr("r", 3 / groupScale);
	lines.style("stroke-width", 1 / groupScale);
	constrainingPoints.attr("r", 5 / groupScale);
}

function startMoving() {
	var startingPosition = d3.mouse(this);
	svg.on("mousemove", function() {
		var currentPosition = d3.mouse(this);
		groupPositionX = oldGroupPositionX + currentPosition[0] - startingPosition[0];
		groupPositionY = oldGroupPositionY + currentPosition[1] - startingPosition[1];
		transformGroup();
	});
}

function stopMoving() {
	svg.on("mousemove", null);
	oldGroupPositionX = groupPositionX;
	oldGroupPositionY = groupPositionY;
}

function reScale() {
		//detect the mousewheel event
	if (d3.event.sourceEvent.type.indexOf("wheel") != -1 || d3.event.sourceEvent.type.indexOf("wheel") != -1){
  		var scaleChange = .1;
  		if (d3.event.sourceEvent.wheelDelta){
			if (d3.event.sourceEvent.wheelDelta < 0){
				scaleChange =  scaleChange * -1;
			}
		}else{
			if (d3.event.sourceEvent.detail < 0){
				scaleChange =  scaleChange * -1;
			}
		}
		// Calculate the change of the scale and the new translation-parameter
		groupScale = groupScale + scaleChange;

		transformGroup();
	}
}

function getExtent(elements) {
	var extent = [[181, 181], [-181, -181]];
	elements.features.forEach(function(feature) {
	feature.geometry.coordinates.forEach(function(point) {
		// build the extent
		if (point[0] < extent[0][0]) extent[0][0] = point[0];
		if (point[1] < extent[0][1]) extent[0][1] = point[1];
		if (point[0] > extent[1][0]) extent[1][0] = point[0];
		if (point[1] > extent[1][1]) extent[1][1] = point[1];
		});
	});
	return extent;
}

function getAllPoints(elements, extent, projection) {
	var dataPoints = [];
	elements.features.forEach(function(feature) {
		feature.geometry.coordinates.forEach(function(point) {
			dataPoints.push(projection(point));
		});
	});
	return dataPoints;
}