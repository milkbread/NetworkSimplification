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

// Transform all groups in relation to new values:
// 		- 'groupScale'
// 		- 'groupPositionX' & 'groupPositionY'
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

// Action when mouse-movement has started
function startMoving() {
	// save the starting position of the mouse
	var startingPosition = d3.mouse(this);
	// add mouse-move event listener to svg-container
	svg.on("mousemove", function() {
		// get current position of the mouse
		var currentPosition = d3.mouse(this);
		groupPositionX = oldGroupPositionX + currentPosition[0] - startingPosition[0];
		groupPositionY = oldGroupPositionY + currentPosition[1] - startingPosition[1];
		// Apply group transformations for all groups
		transformGroup();
	});
}

// Action when the mouse-movement has stopped
function stopMoving() {
	// remove mouse-move event listener from the svg-container
	svg.on("mousemove", null);
	// Re-Define the globally defined old group position
	oldGroupPositionX = groupPositionX;
	oldGroupPositionY = groupPositionY;
}

// Change the global 'scale' on a mousewheel-drag-event
function reScale() {
	// check if the drag-event is a mousewheel event
	if (d3.event.sourceEvent.type.indexOf("wheel") != -1){
		// init  a local variable for changed scale
  		var scaleChange = .1;
  		if (d3.event.sourceEvent.wheelDelta){
			if (d3.event.sourceEvent.wheelDelta < 0){
				scaleChange =  scaleChange * -1;
			}
		} else {
			if (d3.event.sourceEvent.detail < 0){
				scaleChange =  scaleChange * -1;
			}
		}
		// Re-Define the new global 'scale'
		groupScale = groupScale + scaleChange;
		// Apply group transformations for all groups
		transformGroup();
	}
}

// Get the extent of geoJSON input data
function getExtent(geoJsonData) {
	// !!!Works only for "LineString" currently!!!
	var extent = [[181, 181], [-181, -181]];
	geoJsonData.features.forEach(function(feature) {
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

// Get all points of geoJSON input data
function getAllPoints(geoJsonData, projection) {
	// !!!Works for 'Points' and 'LineStrings' currently!!!
	var dataPoints = [];
	geoJsonData.features.forEach(function(feature) {
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

// Function to calculate the area of the triangle of one certain point
// snippet taken from: http://bost.ocks.org/mike/simplify/
function addTriangleSize(feature, projection) {
	// !!!Works only for 'LineStrings' currently!!!
	triangles = [];
	var points = feature.coordinates
	for (var i=1;i<points.length-1;i++){
		var point = feature.coordinates[i];
		triangle = points.slice(i - 1, i + 2);
		if (triangle[1][2] = area(triangle)) {
			triangles.push(triangle);
		}
	}
	var result = feature.coordinates.map(function(lineString) {
		var points = lineString.map(projection);
		for (var i = 1, n = lineString.length - 1; i < n; ++i) {
			triangle = points.slice(i - 1, i + 2);
			if (triangle[1][2] = area(triangle)) {
				triangles.push(triangle);
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

// Calculate the area
function area(t) {
  return Math.abs((t[0][0] - t[2][0]) * (t[1][1] - t[0][1]) - (t[0][0] - t[1][0]) * (t[2][1] - t[0][1]));
}

// Add a ranking to each point
// Logic:
// 			1. - push all triangle-areas into an array
// 			2. - sort the array
// 			3. - make an indexed object from the sorted array {id0: rank, id1: rank, ..., idN: rank}
// 			4. - add the rank to each point (point[3]), by using the indexed object
function rankAfterTriangles(feature) {
	// 1:
	var triangles = feature.geometry.coordinates.map(function(d, i) {
		return {area: typeof d[2] !== "undefined" ? d[2] : -1, index: i};
	})
	// 2:
	triangles.sort(function(a, b) {
		return a.area - b.area;
	});
	// 3:
	var trianglesObject = {};
	triangles.forEach(function(d, rank) {
		trianglesObject[d.index] = rank;
	})
	// 4:
	feature.geometry.coordinates = feature.geometry.coordinates.map(function(point, i) {
		point[3] = trianglesObject[i];
		return point;
	})
	return feature;
}