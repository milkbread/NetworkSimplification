(function() {
d3.clean = function(multiline) {
  // Test if the first or last point of each line has a 'third' value - it shouldn't have it!!!
  multiline.coordinates.forEach(function(line) {
    var length = line.length;
    // Check the first point
    if (typeof line[0][2] !== "undefined") {
      line[0].pop();
    }
    // Check the last point
    if (typeof line[length-1][2] !== "undefined") {
      line[length-1].pop();
    }
  });
};

d3.rank = function(multiline) {
  // We also re-structure the data while ranking:
  // INPUT:   [x, y, area, triangle]
  // OUTPUT:  [x, y, {area, triangle, rank, fixed}]

  // Get all triangles
  var triangles = [], i = 0;
  multiline.coordinates.forEach(function(line, i) {
    line.forEach(function(point, j) {
      if(typeof point[2] !== "undefined") {
        triangles.push({area: point[2], lineIndex: i, pointIndex: j});
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
    line.forEach(function(point, j) {
      if (typeof point[2] !== "undefined") {
        point[2] = {area: point[2], rank: trianglesObject[i][j], triangle: point[3], fixed: false}
        point.pop();  //remove point[3] ~> the triangle
      }
    });
  });
};

d3.simplifyNetwork = function() {
  var projection = d3.geo.albers();

  function simplify(geometry, clearPoints, timing) {
    if (typeof timing !== "undefined" && timing === true) var start = new Date().getMilliseconds();

    if (geometry.type !== "MultiLineString") throw new Error("not yet supported");

    var heap = minHeap(),
      maxArea = 0,
      triangles = [],
      triangle;

    var lines = geometry.coordinates;
    lines.forEach(function(line) {
      var points = line;
      for (var i = 1, n = line.length - 1; i < n; ++i) {
        triangle = points.slice(i - 1, i + 2);
        if (triangle[1][2] = area(triangle)) {
          triangle.area = area(triangle)
          triangle[1][3] = triangle;
          triangles.push(triangle);
          heap.push(triangle);
        }
      }
    });
    // console.log("Number of triangles: " + triangles.length)

    for (var i = 0, n = triangles.length; i < n; ++i) {
      triangle = triangles[i];
      triangle.previous = triangles[i - 1];
      triangle.next = triangles[i + 1];
      triangle.area = triangle[1].area
    }

    triangles.sort(function(a, b) {
      return a.area - b.area;
    });

    var counter = 0;

    while (triangle = heap.pop()) {

      // If the area of the current point is less than that of the previous point
      // to be eliminated, use the latterâ€™s area instead. This ensures that the
      // current point cannot be eliminated without eliminating previously-
      // eliminated points.
      // if (triangle[1][2] < maxArea) triangle[1][2] = maxArea;
      // else maxArea = triangle[1][2];

      if (triangle.previous) {
        triangle.previous.next = triangle.next;
        triangle.previous[2] = triangle[2];
        update(triangle.previous);
      } else {
        triangle[0].area = triangle[1].area;
        triangle[0][2] = triangle[1][2];
        triangle[0][3] = triangle[1][3];
      }

      if (triangle.next) {
        triangle.next.previous = triangle.previous;
        triangle.next[0] = triangle[0];
        update(triangle.next);
      } else {
        triangle[2].area = triangle[1].area;
        triangle[2][2] = triangle[1][2];
        triangle[2][3] = triangle[1][3];
      }

      counter ++;
      if (typeof clearPoints !== "undefined" && counter === clearPoints) {
        break;
      }
    }

    if (typeof timing !== "undefined" && timing === true) console.log('Execution time: ' + (new Date().getMilliseconds() - start) + ' milliseconds');

    function update(triangle) {
      heap.remove(triangle);
      triangle[1].area = area(triangle);
      triangle[1][2] = area(triangle);
      triangle[1][3] = triangle;
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

  heap.length = function() {
    return array.length;
  };

  heap.show = function() {
    return array;
  };

  function up(i) {
    var object = array[i];
    while (i > 0) {
      var up = ((i + 1) >> 1) - 1,
          parent = array[up];
      if (compare(object, parent) >= 0) break;
      array[parent.index = i] = parent;
      array[object.index = i = up] = object;
    }
  }

  function down(i) {
    var object = array[i];
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