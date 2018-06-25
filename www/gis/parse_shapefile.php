<?php

$cwd[__FILE__] = __FILE__;
if (is_link($cwd[__FILE__])) $cwd[__FILE__] = readlink($cwd[__FILE__]);
$cwd[__FILE__] = dirname($cwd[__FILE__]);

require_once($cwd[__FILE__] . "/../../db/my_query.php");
require_once($cwd[__FILE__] . "/../../www/marks.php"); //for create_polygon
require_once($cwd[__FILE__] . "/../../www/labels.php"); //for create_label

// Register autoloader
require_once($cwd[__FILE__] . "/php-shapefile/src/ShapeFileAutoloader.php");
\ShapeFile\ShapeFileAutoloader::register();
require($cwd[__FILE__] . "/vendor/autoload.php");

// Import classes
use \ShapeFile\ShapeFile;
use \ShapeFile\ShapeFileException;
use \PHPCoord\LatLng;
use \PHPCoord\UTMRef;
use \PHPCoord\RefEll;

function relative_coords($x, $y, $left, $right, $top, $bot){
    $x_range = abs($left - $right);
    $y_range = abs($top - $bot);
    $x_rel = number_format(abs($x - $left)/$x_range, 8);
    $y_rel = number_format(abs($y - $top)/$x_range, 8);
    return "$x_rel,$y_rel ";
}

function point($coords, $mosaic){
    $lng = $coords[0];
    $lat = $coords[1];
    $latlng = new LatLng($lat, $lng, 0, RefEll::wgs84());
    $utm = $latlng->toUTMRef();
    return relative_coords($utm->getX(), $utm->getY(), $mosaic['left'], $mosaic['right'], $mosaic['top'], $mosaic['bot']); 
}

function insert_attributes($attrs, $mark_id){
    $query = "INSERT INTO mark_attributes (mark_id, attribute_key, attribute_value) VALUES ";
    foreach($attrs as $key => $val){
        if($val != NULL){
            //echo $key."=>".$attrs[$key];
            $query.= "($mark_id, '$key', '$val'), ";
        }
    }
    $query = substr($query, 0, -2);
    //echo $query."\n";
    query_our_db($query);
}


function insert_shape($mosaic, $label_id, $points, $type, $label_name, $user_id, $shapefile_id, $attr) {
    
    $mosaic_id = $mosaic['id'];

    // Hard coded color for shapefile shapes
    // TODO Make this dynamically generated
    $color = "#00ee00";

    if ($type == 'Point') {
        $coord_str = point($points, $mosaic);
        $coords = explode(",", $coord_str);

        $p = array(array("cx"=>$coords[0], "cy"=>$coords[1], "radius"=>0.005));

        $label_type = "POINT";
        $mark_id = create_points($user_id, $mosaic_id, $label_id, $p);

        //$query = "INSERT INTO shapefile_shapes (shapefile_id, mark_id) VALUES ($shapefile_id, $mark_id)";    
        //query_our_db($query);
        insert_attributes($attr, $mark_id);

        //echo "Mosaic Id: ".$mosaic['id']."\n";
        //echo "Relative Coords: ".$coord_str."\n";
        //print_r($p);
    } else  if ($type=='LineString') {
        $label_type = "LINE";
        //$label_id = create_label($user_id, $mosaic_id, $label_name, $label_type, $color);

        for ($i = 0; $i < count($points)-1; $i++) {
            $p1 = explode(",",point($points[$i], $mosaic));
            $p2 = explode(",",point($points[$i+1], $mosaic));

            $line = array();
            $line['x1']=$p1[0];
            $line['y1']=$p1[1];
            $line['x2']=$p2[0];
            $line['y2']=$p2[1];

            $mark_id = create_lines($user_id, $mosaic_id, $label_id, array($line));
            //$query = "INSERT INTO shapefile_shapes(shapefile_id, mark_id) VALUES ($shapefile_id, $mark_id)";
            //query_our_db($query);

            insert_attributes($attr, $mark_id);
        }
    } else if ($type=='Polygon') {
        exit(1);

        $coord_str="";

        foreach ($points as $p){
            $coord_str.= point($p, $mosaic);
        }

        $lable_type = "POLYGON";
        $label_id = create_label($user_id, $mosaic_id, $label_name, $label_type, $color);
        $mark_id = create_polygon($user_id, $mosaic_id, $label_id, $coord_str);

        $query = "INSERT INTO shapefile_shapes (shapefile_id, mark_id) VALUES ($shapefile_id, $mark_id)";    
        query_our_db($query);

        insert_attributes($attr, $mark_id);
        //echo "Relative Coords: ".$coord_str."\n";
        //echo "Mosaic Id: ".$mosaic['id']."\n";
    }


    return;
}

function coords($zone, $x, $y){
    $UTMref = new UTMRef($x, $y, 0, substr($zone,-1,1), (int)substr($zone,0,2));
    $p0 = $UTMref->toLatLng();
    $lat = $p0->getLat();
    $lon = $p0->getLng();
    return "$lon $lat";
}

function insert_shapefile($shapefile, $user_id){
    global $our_db;
    $query = "INSERT INTO shapefiles (owner_id, filepath) VALUES ($user_id, '$shapefile') ";    
    query_our_db($query);
    return $our_db->insert_id;
}

function parsed($shapefile, $user_id){
   $query = "SELECT * FROM shapefiles WHERE owner_id = $user_id AND filepath = '$shapefile'";
   $result = query_our_db($query);
   return ($result->fetch_assoc() != NULL);
}


function import_shapefile($user_id, $mosaic_id, $label_id, $dbf_file, $shp_file, $shx_file, $import_type) {
    global $our_db, $cwd;

    error_log("GEOS installed: " . geoPHP::geosInstalled());
    error_log("GEOS version: " . GEOSVersion());
    // Make POLYGONS in well known text format and convert to geoPHP objects of each mosaic the user has permission to.

    $query = "SELECT id, utm_e_upper_left AS `left`, utm_e_upper_right as `right`, utm_n_upper_left as `top`, utm_n_lower_right as `bot`, utm_zone as `zone` ";
    $query .= "FROM mosaics JOIN mosaic_access ON mosaic_access.mosaic_id = mosaics.id AND mosaics.id = $mosaic_id ";
    $query .= "WHERE utm_zone IS NOT NULL ";
    $query .= "AND (user_id = $user_id OR mosaics.owner_id = $user_id) ";
    error_log($query);
    $result = query_our_db($query);

    $row = $result->fetch_assoc();

    if ($row == NULL) {
        exit(1);
    }

    $shape_str = "POLYGON((";
    $shape_str.= coords($row['zone'], $row['left'], $row['top']).",";
    $shape_str.= coords($row['zone'], $row['left'], $row['bot']).",";
    $shape_str.= coords($row['zone'], $row['right'], $row['bot']).",";
    $shape_str.= coords($row['zone'], $row['right'], $row['top']).",";
    $shape_str.= coords($row['zone'], $row['left'], $row['top'])."))";
    $mosaic = array('row'=>$row, 'shp'=>geoPHP::load($shape_str, 'wkt'));

    error_log("geometry list:" . print_r(geoPHP::geometryList(), true));

    // Open shapefile, this requires .dbf .shp and ...
    //$ShapeFile = new ShapeFile($shapefile_name);
    $ShapeFile = new ShapeFile(array(
        'shp'   => "$shp_file",
        'shx'   => "$shx_file",
        'dbf'   => "$dbf_file"
    ));


    error_log("shapefile->getPRJ:" . print_r($ShapeFile->getPRJ(), true));

    $response_lines = array();
    $response_points = array();
    $response_polygons = array();

    while ($record = $ShapeFile->getRecord(ShapeFile::GEOMETRY_WKT, ShapeFile::FLAG_SUPPRESS_Z | ShapeFile::FLAG_SUPPRESS_M)) {
        // Check if the record is deleted
        if ($record['dbf']['_deleted']) continue;

        $attrs = $record['dbf'];

        // Load well known text format into a geoPHP object
        $shape = geoPHP::load($record['shp'],'wkt');
        //echo "SHAPE:\n";
        //print_r($shape);

        //echo "DBF record -- lat: " . $record['dbf']['Lat'] . ", lon: " . $record['dbf']['Long'] . "\n";
        //print_r($record['dbf']);

        if ($shape->intersects($mosaic['shp'])) {
            // Find the intersection, type and convert to php array.
            $intersection = $shape->intersection($mosaic['shp']);
            $type = $intersection->geometryType();

            error_log("shape '$type' intersects");

            $points = $intersection->boundary()->asArray();
            //echo "Points: ";
            //print_r($points);
            //echo "\n";

            // Insert shape into shapes, shapefile_shapes and the appropriate shape type table
            // This also creates a label based on the shapefile name
            //insert_shape($mosaic['row'], $label_id, $points, $type, $shapefile_name, $user_id, $shapefile_id, $record['dbf']);

            if ($type == "LineString" && $import_type == "LINES") {
                for ($i = 0; $i < count($points)-1; $i++) {
                    $p1 = explode(",", point($points[$i], $mosaic['row']));
                    $p2 = explode(",", point($points[$i+1], $mosaic['row']));

                    $line = array();
                    $x1 = $p1[0];
                    $y1 = $p1[1];
                    $x2 = $p2[0];
                    $y2 = $p2[1];

                    $query = "INSERT INTO `lines` SET owner_id = $user_id, mosaic_id = $mosaic_id, label_id = $label_id, x1 = $x1, x2 = $x2, y1 = $y1, y2 = $y2";
                    error_log($query);
                    query_our_db($query);
                    $line_id = $our_db->insert_id;
                    $line_ids[] = $line_id;

                    insert_attributes($attrs, $line_id);

                    $line = array(
                        'label_id' => $label_id,
                        'line_id' => $line_id,
                        'x1' => $x1,
                        'y1' => $y1,
                        'x2' => $x2,
                        'y2' => $y2,
                        'visible' => true
                    );  
                    $line_template = file_get_contents($cwd[__FILE__] . "/../templates/line_template.html");
                    $m = new Mustache_Engine;
                    $line['html'] = $m->render($line_template, $line);

                    $response_lines[] = $line;
                }

            } else if ($type == "Point" && $import_type == "POINTS") {
                $coord_str = point($points, $mosaic['row']);
                $coords = explode(",", $coord_str);

                $cx = $coords[0];
                $cy = $coords[1];
                $radius = 0.005;

                $label_type = "POINT";

                $query = "INSERT INTO points SET owner_id = $user_id, mosaic_id = $mosaic_id, label_id = $label_id, cx = $cx, cy = $cy, radius = $radius";
                error_log($query);
                query_our_db($query);
                $point_id = $our_db->insert_id;

                insert_attributes($attrs, $point_id);

                $point = array(
                    'label_id' => $label_id,
                    'point_id' => $point_id,
                    'cx' => $cx,
                    'cy' => $cy,
                    'radius' => $radius,
                    'visible' => true
                );

                $point_template = file_get_contents($cwd[__FILE__] . "/../templates/point_template.html");
                $m = new Mustache_Engine;
                $point['html'] = $m->render($point_template, $point);

                $response_points[] = $point;

            } else if ($type == "Polygon" && $import_type == "POLYGONS") {
                $points_str="";

                foreach ($points as $p){
                    $points_str.= point($p, $mosaic['row']);
                }

                $query = "INSERT INTO polygons SET owner_id = $user_id, mosaic_id = $mosaic_id, label_id = $label_id, points_str = '$points_str'";
                error_log($query);
                query_our_db($query);
                $polygon_id = $our_db->insert_id;

                insert_attributes($attrs, $polygon_id);


                $polygon = array(
                    'label_id' => $label_id,
                    'polygon_id' => $polygon_id,
                    'points_str' => $points_str,
                    'points' => create_polygon_points($points_str),
                    'visible' => true
                );

                $polygon_template = file_get_contents($cwd[__FILE__] . "/../templates/polygon_template.html");
                $m = new Mustache_Engine;
                $polygon['html'] = $m->render($polygon_template, $polygon);
 
                $response_polygons[] = $polygon;
            }

        } else {
            error_log("shape does not intersect");
        }
    }

    $response = array();

    if ($import_type == "LINES") $response['lines'] = $response_lines;
    else if ($import_type == "POINTS") $response['points'] = $response_points;
    else if ($import_type == "POLYGONS") $response['polygons'] = $response_polygons;

    echo json_encode($response);
}

?>
