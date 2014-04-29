// Collapse the quadtree into an array of rectangles.
function nodes(quadtree) {
  var nodes = [];
  quadtree.visit(function(node, x1, y1, x2, y2) {
    nodes.push({x: x1, y: y1, width: x2 - x1, height: y2 - y1});
  });
  return nodes;
}

// Add the selector for the number of points to remove (when a line was selected) and implement filtering
function addSimplificationSelector(id, path) {
	// 'un-highlight' all lines
	lineGroup.selectAll(".line").classed("selected", false);
	// highlight the selected line ... and a HACK: get the number of points from that line
	var length = -1;
	lineGroup.select("#line" + id)
		.classed("selected", function(d) {length = d.geometry.coordinates.length; return true;});
	// show the 'selector' of the point number to remove ... only if line has more than 2 points
	if (length > 2) {
		pointNumberSelector.addElements(d3.range(length-1).map(function(d) {return {properties: {id: d}}}), "");
	} else {
		// throw error otherwise
		pointNumberSelector.throwException("Nop...number of points is <= 2!");
	}
	pointNumberSelector.select
		.on("change", function() {
			var numberOfPoints = pointNumberSelector.selectedID()
			lineGroup.select("#line" + id)
				.attr("d", function(d) {
					return path({
						type: d.geometry.type,
						coordinates: d.geometry.coordinates.filter(function(point) {
							return filterPoints(point, numberOfPoints);
						})
					});
				});
		})
}

function transformGroup() {
	// Transform all groups
	groups.forEach(function(group) {
		group.group.attr("transform", function(d){
			return "scale("+groupScale+", -"+groupScale+") translate("+groupPositionX+",-" + ((height - 10) + groupPositionY) + ")"; });
	})
	// Re-Scale size of points and lines
	qRectLines.style("stroke-width", .1 / groupScale);
	qRectPoints.style("stroke-width", .1 / groupScale);
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

function getAllPoints(elements, projection) {
	var dataPoints = [];
	elements.features.forEach(function(feature) {
		if (feature.geometry.type === "LineString") {
			feature.geometry.coordinates.forEach(function(point) {
				dataPoints.push(projection(point));
			});
		} else if (feature.geometry.type === "Point") {
			dataPoints.push(projection(feature.geometry.coordinates));
		}
	});
	return dataPoints;
}

function filterPoints(point, numberOfPoints) {
	if (typeof point[2] !== "undefined") {
		return point[3] > parseInt(numberOfPoints) + 1;
	} else return point;
}

function addTriangleSize(feature, projection) {
	triangles = [];
	var points = feature.coordinates
	for (var i=1;i<points.length-1;i++){
		var point = feature.coordinates[i];
		triangle = points.slice(i - 1, i + 2);
		if (triangle[1][2] = area(triangle)) {
			triangles.push(triangle);
			// heap.push(triangle);
		}
	}
	var result = feature.coordinates.map(function(lineString) {
		var points = lineString.map(projection);
		for (var i = 1, n = lineString.length - 1; i < n; ++i) {
			triangle = points.slice(i - 1, i + 2);
			if (triangle[1][2] = area(triangle)) {
				triangles.push(triangle);
				// heap.push(triangle);
			}
		}

		for (var i = 0, n = triangles.length; i < n; ++i) {
			triangle = triangles[i];
			triangle.previous = triangles[i - 1];
			triangle.next = triangles[i + 1];
		}
		return points;
	});
	return result;
}

function area(t) {
  return Math.abs((t[0][0] - t[2][0]) * (t[1][1] - t[0][1]) - (t[0][0] - t[1][0]) * (t[2][1] - t[0][1]));
}

function rankAfterTriangles(feature) {
	var triangles = feature.geometry.coordinates.map(function(d, i) {return {area: typeof d[2] !== "undefined" ? d[2] : -1, index: i};})
	triangles.sort(function(a, b) {
		return a.area - b.area;
	});
	var trianglesObject = {};
	triangles.forEach(function(d, rank) {
		trianglesObject[d.index] = rank;
	})
	feature.geometry.coordinates = feature.geometry.coordinates.map(function(point, i) {
		point[3] = trianglesObject[i];
		return point;
	})
	return feature;
}