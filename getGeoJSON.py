#!/usr/bin/env python

import sys
from osgeo import ogr, osr
import json
import copy

FEATCOLL_DUMMY = {
    "type": "FeatureCollection",
    "features": []
}

FEATURE_DUMMY = {
  "type": "Feature",
  "geometry": {
    "type": "",
    "coordinates": []
  },
  "properties": {
  	'id':None
  }
}

def saveLinesToGeoJSONMultilineString(filename, geometries):
	multiline = copy.deepcopy(FEATURE_DUMMY)
	multiline["geometry"]["type"] = "MultiLineString"
	print multiline
	# for i in range(len(geometries)):


def saveToGeoJSON(filename, geometries, indizes=None):
	features = []
	for i in range(len(geometries)):
		id = indizes[i] if indizes else i
		geom = geometries[i]

		# add geometry to geoJSON-geometry-dummy
		geojson = copy.deepcopy(FEATURE_DUMMY)
		geojson['properties']['id'] = id

		if geom.GetGeometryType() == 1:
			geom_type = "Point"
		elif geom.GetGeometryType() == 2:
			geom_type = "LineString"
		else:
			raise TypeError("Geometry type ('%s') currently not defined" % geom.GetGeometryType())

		geojson['geometry']['type'] = geom_type
		# Cleaning for GeoJSON...by replacing '(...)' with '[...]'
		geojson_points = []
		# print geom.type
		if geom_type == 'Point' or geom_type == 'LineString':
			coords = list(geom.GetPoints())
			for coord in coords:
				geojson_points.append([coord[0],coord[1]])
		elif geom_type == 'Polygon':
			coords = list(geom.exterior.coords)
			for coord in coords:
				geojson_points.append([coord[0],coord[1]])
		elif geom_type == 'MultiLineString':
			for geom_ in geom.geoms:
				coords = geom_.coords
				geojson_points_ = []
				for coord in coords:
					geojson_points_.append([coord[0],coord[1]])
				geojson_points.append(geojson_points_)
		# Make GeoJSON
		if geom_type == 'Point':
			geojson['geometry']['coordinates'] = geojson_points[0]
		elif geom_type == 'LineString' or geom_type == 'MultiLineString':
			geojson['geometry']['coordinates'] = geojson_points
		elif geom_type == 'Polygon':
			geojson['geometry']['coordinates'] = [geojson_points]
		features.append(geojson)

	# add features to feature-collection-dummy
	featurecoll_geojson = FEATCOLL_DUMMY.copy()
	featurecoll_geojson['features'] = features

	# make a 'crs' and add it to the featureCollection ... currently only for 4326
	crs = {"type": "link", "properties": {"href": "http://spatialreference.org/ref/epsg/4326/", "type": "epsg"}}
	featurecoll_geojson["properties"] = crs

	# save geoJSON to file
	with open(filename, "w") as file:
		file.write(json.dumps(featurecoll_geojson, indent=4))
	file.close()

def transform(geom, epsg):
	# Init reference of source
	source = osr.SpatialReference()
	source.ImportFromEPSG(int(epsg))
	# Init targeted reference system ... currently on 'geographical coordinates' (4326)
	target = osr.SpatialReference()
	target.ImportFromEPSG(4326)
	# Init transformation
	transformation = osr.CoordinateTransformation(source, target)
	# Transform geometry
	geom.Transform(transformation)
	return geom

def getOGRGeometries(data, transform_ = None):
	geometries = []
	real_index_list = []
	for line in data.readlines():
		# check if we have to remove two or three chars from line
		index_ = 2 if line[1:2]==':' else 3
		real_index_list.append(line[:index_].replace(':',''))

		# remove first 'index'-chars
		gml_ = line[index_:]
		# convert to ogr-geometry
		if transform_:
			ogr_geometry = transform(ogr.CreateGeometryFromGML(gml_), transform_)
		else:
			ogr_geometry = ogr.CreateGeometryFromGML(gml_)
		geometries.append(ogr_geometry)
	return geometries, real_index_list

def main(argv=None):
	if argv is None:
		argv = sys.argv
	try:
		source_ = argv[1]
	except:
		raise ValueError("No data input given!")
	try:
		output_name_ = argv[2]
	except:
		output_name_ = "output"
	try:
		transform_ = argv[3]
	except:
		transform_ = None

	try:
		data_input = open(source_, 'r')
	except:
		raise ValueError("'%s' does not exist!" % source_)

	data, indizes = getOGRGeometries(data_input, transform_)
	print indizes

	saveToGeoJSON('results/%s.json' % output_name_, data, indizes)
	saveLinesToGeoJSONMultilineString('results/%s.json' % output_name_, data)

if __name__ == "__main__":
    sys.exit(main())
