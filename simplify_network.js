(function() {
d3.clean = function(multiline) {
  // Test if the first or last point of each line has a 'third' value - it shouldn't have it!!!
  multiline.coordinates.forEach(function(line) {
    var length = line.length;
    // Define the first point
    line[0][2] = {fixed: true, startEnd: true};
    // Define the last point
    line[length-1][2] = {fixed: true, startEnd: true};
  });
};

d3.rank = function(multiline) {
  // We also re-structure the data while ranking:
  // INPUT:   [x, y, area, triangle]
  // OUTPUT:  [x, y, {area, triangle, rank, fixed}]

  // Get all triangles
  var triangles = [], i = 0;
  multiline.coordinates.forEach(function(line, i) {
    var pCounter = 0;
    line.forEach(function(point, j) {
      var fixed = typeof point[4] !== "undefined" && point[4] === true ? true : false;
      // omit 1st AND last point
      if(j>0 && j<line.length-1 && fixed === false) {
        triangles.push({area: point[2], lineIndex: i, pointIndex: pCounter});
        pCounter++;
      }
    });
  });
  // Sort the triangles
  triangles.sort(function(a, b) {
    return a.area - b.area;
  });
  // Build a dict with all ranking values
  var trianglesObject = [];
  triangles.forEach(function(d, rank) {
    // if inner dict does not exist, build one
    if (typeof trianglesObject[d.lineIndex] === "undefined") {
      var dummyDict = {};
      dummyDict[d.pointIndex] = rank
      trianglesObject[d.lineIndex] = dummyDict;
    }
    trianglesObject[d.lineIndex][d.pointIndex] = rank;
  });
  // Set rank to each point
  multiline.coordinates.forEach(function(line, i) {
    var pCounter = 0;
    line.forEach(function(point, j) {
      // omit 1st AND last point
      var fixed = typeof point[4] !== "undefined" && point[4] === true ? true : false;
      if (j>0 && j<line.length-1 && fixed === false) {
        point[2] = {area: point[2], rank: trianglesObject[i][pCounter], triangle: point[3], fixed: fixed}
        pCounter++;
      } else if(j>0 && j<line.length-1 && fixed === true) {
        point[2] = {area: point[2], triangle: point[3], fixed: fixed}
      } else {
        point[2] = {fixed: true, startEnd: true};
      }
      point.splice(3, point.length);  //remove all other 'attributes' (if some exist)
    });
  });
};

// Find the nodes within the specified rectangle.
function searchCPointInQuadtree(quadtree, triangle, projection) {
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

function searchCLineInQuadtree(quadtree, triangle) {
  var foundConstPoint = false;
  quadtree.visit(function(node, x1, y1, x2, y2) {
    // Check if there is a point in the node
    var p = node.point;
    if (p) {
      // console.log(p)
      // p[2] = 'visited';
      if (pointInTriangle(p, triangle[0], triangle[1], triangle[2]) && triangle.lineIndex !== p[2]) {
        foundConstPoint = true;
      }
    }
    // get the extent of the triangle
    var extent = getExtentOfTriangle(triangle);
    // return true if extent lies not in the extent of the node (does not search on in this node)
    return x1 >= extent[2] || y1 >= extent[3] || x2 < extent[0] || y2 < extent[1];
  });
  return foundConstPoint;
}

d3.simplifyNetwork = function() {
  var projection = d3.geo.albers();

  function simplify(geometry, clearPoints, quadtreePoints, timing) {
    if (typeof timing !== "undefined" && timing === true) var start = new Date().getMilliseconds();

    if (geometry.type !== "MultiLineString") throw new Error("not yet supported");

    var rawQuadtree = d3.geom.quadtree();

    var heap = minHeap(),
      maxArea = 0,
      triangle;
    var linePoints = [];

    var lines = geometry.coordinates;
    lines.forEach(function(line, index) {
      var points = line;
      var triangles = [];
      for (var i = 1; i < line.length - 1; i++) {
        triangle = points.slice(i - 1, i + 2);
        if (triangle[1][2] = area(triangle)) {
          triangle[1][3] = triangle;
          triangles.push(triangle);
          heap.push(triangle);
        }
      }
      for (var i = 0, n = triangles.length; i < n; ++i) {
        triangle = triangles[i];
        triangle.previous = triangles[i - 1];
        triangle.next = triangles[i + 1];
        // define the lineIndex to enable differentiation during searching in quadtree
        triangle.lineIndex = index;
        triangle.area = triangle[1].area
      }
      linePoints = linePoints.concat(points.map(function(p) {
        return [p[0], p[1], index];
      }));
    });
    // console.log("Number of triangles: " + triangles.length)

    // triangles.sort(function(a, b) {
    //   return a.area - b.area;
    // });

    var counter = 0;
    var quadtreeLines = rawQuadtree(linePoints);

    while (triangle = heap.pop()) {

      // If the area of the current point is less than that of the previous point
      // to be eliminated, use the latterâ€™s area instead. This ensures that the
      // current point cannot be eliminated without eliminating previously-
      // eliminated points.
      // if (triangle[1][2] < maxArea) triangle[1][2] = maxArea;
      // else maxArea = triangle[1][2];

      var conflictPoints = searchCPointInQuadtree(quadtreePoints, triangle, projection);
      var conflictSelf = searchCLineInQuadtree(quadtreeLines, triangle);

      if(conflictPoints === false && conflictSelf === false){
        if (triangle.previous) {
          triangle.previous.next = triangle.next;
          triangle.previous[2] = triangle[2];
          update(triangle.previous);
        } else {
          triangle[0][2] = triangle[1][2];
          triangle[0][3] = triangle[1][3];
        }

        if (triangle.next) {
          triangle.next.previous = triangle.previous;
          triangle.next[0] = triangle[0];
          update(triangle.next);
        } else {
          triangle[2][2] = triangle[1][2];
          triangle[2][3] = triangle[1][3];
        }
      } else {
        triangle[1][3] = triangle;
        triangle[1][4] = true;
      }

      counter ++;
      if (typeof clearPoints !== "undefined" && counter === clearPoints) {
        // break;
      }
    }

    if (typeof timing !== "undefined" && timing === true) console.log('Execution time: ' + (new Date().getMilliseconds() - start) + ' milliseconds');

    function update(triangle) {
      // remove the triangle from the heap-array
      heap.remove(triangle);
      triangle[1][2] = area(triangle);
      triangle[1][3] = triangle;
      // add the triangle it 'sorted'
      heap.push(triangle);
    }

    // console.log("Walkthroughs: " + counter)
    return geometry;
  }

  simplify.projection = function(_) {
    if (!arguments.length) return projection;
    projection = _;
    return simplify;
  };

  return simplify;
};

function compare(a, b) {
  return a[1][2] - b[1][2];
}

function area(t) {
  return Math.abs((t[0][0] - t[2][0]) * (t[1][1] - t[0][1]) - (t[0][0] - t[1][0]) * (t[2][1] - t[0][1]));
}

function minHeap() {
  var heap = {},
      array = [];

  heap.push = function() {
    for (var i = 0, n = arguments.length; i < n; ++i) {
      var object = arguments[i];
      up(object.index = array.push(object) - 1);
    }
    return array.length;
  };

  heap.pop = function() {
    var removed = array[0],
        object = array.pop();
    if (array.length) {
      array[object.index = 0] = object;
      down(0);
    }
    return removed;
  };

  heap.remove = function(removed) {
    var i = removed.index,
        object = array.pop();
    if (i !== array.length) {
      array[object.index = i] = object;
      (compare(object, removed) < 0 ? up : down)(i);
    }
    return i;
  };

  function up(i) {
    var object = array[i];
    // move object up through the array onto correct place
    while (i > 0) {
      var up = ((i + 1) >> 1) - 1,
          parent = array[up];
      // compare area of object and parent ... stop when object is bigger than parent
      if (compare(object, parent) >= 0) break;
      array[parent.index = i] = parent;
      array[object.index = i = up] = object;
    }
  }

  function down(i) {
    var object = array[i];
    // move object down through the array onto the correct place
    while (true) {
      var right = (i + 1) << 1,
          left = right - 1,
          down = i,
          child = array[down];
      if (left < array.length && compare(array[left], child) < 0) child = array[down = left];
      if (right < array.length && compare(array[right], child) < 0) child = array[down = right];
      if (down === i) break;
      array[child.index = i] = child;
      array[object.index = i = down] = object;
    }
  }
  return heap;
}

})();