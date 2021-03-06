// Collapse the quadtree into an array of rectangles.
function nodes(quadtree) {
	var nodes = [];
	quadtree.visit(function(node, x1, y1, x2, y2) {
	nodes.push({x: x1, y: y1, width: x2 - x1, height: y2 - y1});
	});
	return nodes;
}

// Find the nodes within the specified rectangle.
function search(quadtree, triangle, projection) {
	var foundConstPoint = false;
	quadtree.visit(function(node, x1, y1, x2, y2) {
		// Project triangle points to have comparable values
		var triangle_ = triangle.map(function(p){return projection(p);})
		// Check if there is a point in the node
		var p = node.point;
		if (p) {
			// p[2] = 'visited';
			if (pointInTriangle(p, triangle_[0], triangle_[1], triangle_[2])) {
				p[2] = 'affected';
				foundConstPoint = true;
			}
		}
		// get the extent of the triangle
		var extent = getExtentOfTriangle(triangle_);
		// return true if extent lies not in the extent of the node (does not search on in this node)
		return x1 >= extent[2] || y1 >= extent[3] || x2 < extent[0] || y2 < extent[1];
	});
	return foundConstPoint;
}

// Add the selector for the number of points to remove (when a line was selected) and implement filtering
function addSSelectorSingleLine(id, path, projection, constrainingPointsVis) {
	// 'un-highlight' all lines
	lineGroup.selectAll(".line").classed("selected", false);
	labelGroup.selectAll(".label").classed("selected", false);
	// highlight the selected line ... and a HACK: get the number of points from that line
	var length = -1;
	lineGroup.select("#line" + id)
		.classed("selected", function(d) {length = d.geometry.coordinates.length; return true;});
	labelGroup.select("#label" + id)
		.classed("selected", true);
	// show the 'selector' of the point number to remove ... only if line has more than 2 points
	if (length > 2) {
		pointNumberSelector.addElements(d3.range(length-1).map(function(d) {return {properties: {id: d}}}), "");
	} else {
		// throw error otherwise
		pointNumberSelector.throwException("Nop...number of points is <= 2!");
	}
	// Remove all drawn triangles
	triangleGroupFixed.selectAll(".triangle").remove();
	pointNumberSelector.select
		.on("change", function() {
			var numberOfPoints = pointNumberSelector.selectedID()
			lineGroup.select("#line" + id)
				.attr("d", function(d) {
					// remove the class 'current' from all triangles
					linesSingleDataPoints = [];
					triangleGroupFixed.selectAll(".triangle").classed("current", false);
					return path({
						type: d.geometry.type,
						coordinates: d.geometry.coordinates.filter(
							function(point, i) {
								var filteredPoint = filterPoints(point, numberOfPoints, projection, path, i);
								if(filteredPoint === true) linesSingleDataPoints.push(point);
								return filteredPoint;
							})
					});
				});
			constrainingPointsVis
				.classed("affected", function(d) {
					return typeof d[2] !== "undefined" && d[2] === "affected" ? true : false;
				});
			// pointGroupSingle.selectAll(".point").remove();
			pointsSingle = pointGroupSingle.selectAll(".point").data(linesSingleDataPoints);

			pointsSingle.classed("fixed", function(d){return typeof d[2] !== "undefined" && d[2].fixed === true ? true : false;})
			pointsSingle.enter().append("circle")
					.attr("class", "point")
					.attr("cx", function(d) { return projection(d)[0]; })
					.attr("cy", function(d) { return projection(d)[1]; })
					.classed("fixed", function(d){return typeof d[2] !== "undefined" && d[2].fixed === true ? true : false;})
			pointsSingle.exit().remove();
			transformGroup();
		})
}

function filterPoints(point, numberOfPoints, projection, path, i) {
	if (typeof point[2] !== "undefined") {
		// Stop directly when the point got the 'fixed'-value
		if(point[2].fixed === true) {
			// return point;
		}
		// Draw the triangle of the point that was removed last (as its rank is identic with the 'numberOfPoints' to remove)
		if (point[2].rank === parseInt(numberOfPoints) + 1) {
			var triangleCoords = point[2].triangle;
			triangleCoords.push(triangleCoords[0])
			// Check if we have already drawn that triangle
			var currentTriangle = triangleGroupFixed.select("#triangle"+i);
			if (currentTriangle.empty()) {
				// ...append it if not
				currentTriangle = triangleGroupFixed.append("path")
					.attr("class", "triangle")
					.attr("id", "triangle"+i);
			}
			// define the coordinates of the triangle visualisation and highlight it as 'current'
			// console.log(triangleCoords)
			currentTriangle
				.attr("d", path({
					type: "Polygon",
					coordinates: [triangleCoords]
				}))
				.classed("current", true);
		}
		if (point[2].rank <= numberOfPoints + 1 ){
			// console.log("will now search")
			point[2].fixed = search(quadtreePoints, point[2].triangle, projection);
			if(point[2].fixed === true) {
				return point;
			}
		}
		return point[2].rank > parseInt(numberOfPoints) + 1;
	} else return point;
}

function addNSelectorSingleLine(multiLineGeom, path, range, simplifyNetwork, constrainingPointsVis) {
	pointNumberSelectorNetwork.addElements(range.map(function(d) {return {properties: {id: d}}}), "");

	pointNumberSelectorNetwork.select
		.on("change", function() {
			triangleGroupFixed.selectAll(".triangle").remove();
			var numberOfPoints = pointNumberSelectorNetwork.selectedID();

			if (numberOfPoints > 0) {
				simplifyNetwork(multiLineGeom, numberOfPoints, quadtreePoints, true);
				d3.rank(multiLineGeom);
				// d3.clean(multiLineGeom);
			}

			// linesNetworkDataPoints = [];
			lineNetworkGroup.select(".lineNetwork")
				.attr("d", function(d) {
					var index = 0;
					var geom = {
						type: d.type,
						coordinates: d.coordinates.map(function(line) {
							return line.filter(function(point) {
								var filteredPoint = filterPointsSimple(point, numberOfPoints, path);
								linesNetworkDataPoints[index][2].hidden = !filteredPoint;
								index ++;
								return filteredPoint;
							})
						})
					}
					return path(geom);
				});
			constrainingPointsVis
				.classed("affected", function(d) {
					return typeof d[2] !== "undefined" && d[2] === "affected";
				});

			var numFixedPoints = 0, numRemovedPoints = 0;
			pointsNetwork
					.classed("fixed", function(d){
						if(d[2].fixed === true && d[2].startEnd !== true) numFixedPoints++;
						return d[2].fixed === true && d[2].startEnd !== true? true : false;
					})
					.on("mouseover", function(d) {
						if(d[2].hidden === false && d[2].startEnd !== true) {
							var triangle = d[2].triangle;
							triangle.push(triangle[0]);
							triangleGroupSelected.select(".selected").remove();
							triangleGroupSelected.append("path")
								.attr("class", "selected")
								.attr("d", path({
									type: "Polygon",
									coordinates: [triangle]
								}));
						}
					})
					.classed("clickable", function(d) {return d[2].hidden === false && d[2].startEnd !== true;})
					.transition().duration(1000)
						.style("opacity", function(d){
							if(d[2].hidden) numRemovedPoints++;
							return d[2].hidden ? 0 : 1;
						});
			fixedPoints.text("Fixed Points: " + numFixedPoints);
			removedPoints.text("Removed Points: " + numRemovedPoints);
		})
}

function filterPointsSimple(point, numberOfPoints, path) {
	if(point[2].fixed === true && point[2].startEnd !== true){
		// ***Show the triangles of the fixed points***
		// ***###***
		var triangleCoords = point[2].triangle;
		// add the first point again to have a closed ring
		triangleCoords.push(triangleCoords[0])
		currentTriangle = triangleGroupFixed.append("path")
			.attr("class", "triangle")
			.attr("d", path({
				type: "Polygon",
				coordinates: [triangleCoords]
			}));
		// ***XXX***
	}
	if (point[2].fixed === false) {
		return point[2].rank > numberOfPoints;
	} else return true;
}

// Transform all groups in relation to new values:
// 		- 'groupScale'
// 		- 'groupPositionX' & 'groupPositionY'
function transformGroup() {
	// Transform all groups
	groups.forEach(function(group) {
		group.svgGroup
			.attr("transform", function(d){
				return "scale("+groupScale+", "+groupScale+") translate("+groupPositionX+"," + ((height - 10) + groupPositionY) + ")";
			});
	})

	// Re-Scale size of points and lines
	qRectLines.style("stroke-width", .1 / groupScale);
	qRectPoints.style("stroke-width", .1 / groupScale);
	boundaries.style("stroke-width", .1 / groupScale);
	pointsSingle.attr("r", function(d){ return typeof d[2] !== "undefined" && d[2].fixed === true ? 6 / groupScale : 3 / groupScale;});
	pointsNetwork.attr("r", 3 / groupScale);
	lines.style("stroke-width", 1 / groupScale);
	constrainingPoints.attr("r", 5 / groupScale);
	labels.attr("font-size", 14 / groupScale);
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

// Function to calculate the area of the triangle of one certain point
// snippet taken from: http://bost.ocks.org/mike/simplify/
function addTriangleSize(feature, projection) {
	// !!!Works only for 'LineStrings' currently!!!
	var points = feature.coordinates
	for (var i=1;i<points.length-1;i++){
		var point = feature.coordinates[i];
		triangle = points.slice(i - 1, i + 2);
		point[2] = {area: area(triangle), triangle: triangle};
	}
	return feature.coordinates;
}

// Calculate the area
function area(t) {
  return Math.abs((t[0][0] - t[2][0]) * (t[1][1] - t[0][1]) - (t[0][0] - t[1][0]) * (t[2][1] - t[0][1]));
}

// Add a ranking to each point
// Logic:
// 			0. - clean data: remove area from first and last point AND build object at point[2]
// 			1. - push all triangle-areas into an array
// 			2. - sort the array
// 			3. - make an indexed object from the sorted array {id0: rank, id1: rank, ..., idN: rank}
// 			4. - add the rank to each point (point[3]), by using the indexed object
function rankAfterTriangles(feature) {
	// 0:
	var length = feature.geometry.coordinates.length;
	feature.geometry.coordinates = feature.geometry.coordinates.map(function(point, i) {
		if (i===0 || i===length-1){
			return [point[0], point[1]];
		} else {
			return [point[0], point[1], {area: point[2], triangle: point[3]}];
		}
	})
	// console.log(feature.geometry.coordinates)
	// 1:
	var triangles = [];
	feature.geometry.coordinates.forEach(function(d, i) {
		if(typeof d[2] !== "undefined") {
			triangles.push({area: d[2].area, index: i});
		}
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
		if (typeof point[2] !== "undefined") point[2].rank = trianglesObject[i];
		return point;
	})
	return feature;
}