<?php
$cwd[__FILE__] = __FILE__;
if (is_link($cwd[__FILE__])) $cwd[__FILE__] = readlink($cwd[__FILE__]);
$cwd[__FILE__] = dirname($cwd[__FILE__]);

require_once($cwd[__FILE__] . "/../db/my_query.php");
require_once($cwd[__FILE__] . "/coordinates.php");

/*
$mosaic_id = $argv[1];
$label_id = $argv[2];

echo "#mosaic_id: $mosaic_id\n";
echo "#label_id: $label_id\n";
 */


//var utm_n = utm_n_upper_left - (y * (utm_n_upper_left - utm_n_lower_left));
//var utm_e = utm_e_upper_left + (x * (utm_e_upper_right - utm_e_upper_left));

function adjust_coords(&$y, &$x, $height, $width) {
    $y = floatval($y);
    $x = floatval($x);

    //$min_dim = min($height, $width);
    $min_dim = $width;
    $y *= $min_dim;
    $x *= $min_dim;

    $y /= $height;
    $x /= $width;
}

function to_utm_e($x, $utm_e_upper_left, $utm_e_upper_right) {
    $utm_e = $utm_e_upper_left + ($x * ($utm_e_upper_right - $utm_e_upper_left));
    return $utm_e;
}

function to_utm_n($y, $utm_n_upper_left, $utm_n_lower_left) {
    $utm_n = $utm_n_upper_left - ($y * ($utm_n_upper_left - $utm_n_lower_left));
    error_log("y: $y, utm_n_upper_left: $utm_n_upper_left, utm_n_lower_left: $utm_n_lower_left, utm_n: $utm_n");
    return $utm_n;
}

function utm_to_lat_lon($north, $east, $utm_zone) { 
	error_log("utm_zone: '$utm_zone'");
	$above_equator = substr($utm_zone, -1) == "N";
	$utm_zone = intval(substr($utm_zone, 0, -1));

	error_log("above_equator: $above_equator, utm_zone: $utm_zone, north: $north, east: $east");

	$ll = utm2ll(floatval($east), floatval($north), $utm_zone, $above_equator);
	error_log($ll);

	return $ll;
}

function export_polygons($label_id, $mosaic_id, $coord_type) {
    $query = "SELECT label_name FROM labels WHERE label_id = $label_id";
    $result = query_our_db($query);
    $row = $result->fetch_assoc();
    $label_name = $row['label_name'];

    echo "#polygons<br>";
    echo "#label: $label_name<br>";

    $query = "SELECT filename, width, height, utm_zone, utm_e_upper_left, utm_n_upper_left, utm_e_upper_right, utm_n_upper_right, utm_e_lower_left, utm_n_lower_left, utm_e_lower_right, utm_n_lower_right FROM mosaics WHERE id = $mosaic_id";
    $result = query_our_db($query);
    $row = $result->fetch_assoc();

    $width = $row['width'];
    $height = $row['height'];
    $filename = $row['filename'];
    $utm_zone = $row['utm_zone'];
    $utm_e_upper_left   = floatval($row['utm_e_upper_left']);
    $utm_e_upper_right  = floatval($row['utm_e_upper_right']);
    $utm_e_lower_left   = floatval($row['utm_e_lower_left']);
    $utm_e_lower_right  = floatval($row['utm_e_lower_right']);
    $utm_n_upper_left   = floatval($row['utm_n_upper_left']);
    $utm_n_upper_right  = floatval($row['utm_n_upper_right']);
    $utm_n_lower_left   = floatval($row['utm_n_lower_left']);
    $utm_n_lower_right  = floatval($row['utm_n_lower_right']);

    echo "#filename: $filename<br>";
    echo "#width: $width, height: $height<br>";
    echo "#utm_e_upper_left: $utm_e_upper_left<br>";
    echo "#utm_e_upper_right: $utm_e_upper_right<br>";
    echo "#utm_e_lower_left: $utm_e_lower_left<br>";
    echo "#utm_e_lower_right: $utm_e_lower_right<br>";
    echo "#utm_n_upper_left: $utm_n_upper_left<br>";
    echo "#utm_n_upper_right: $utm_n_upper_right<br>";
    echo "#utm_n_lower_left: $utm_n_lower_left<br>";
    echo "#utm_n_lower_right: $utm_n_lower_right<br>";


    $query = "SELECT * FROM polygons WHERE mosaic_id = $mosaic_id AND label_id = $label_id";
    $result = query_our_db($query);

    echo "x1,y1 x2,y2 x3,y3 ... xn,yn<br>";
    while ($row = $result->fetch_assoc()) {
        $points_str = $row['points_str'];

        $first = true;
        $points = explode(" ", $points_str);
        foreach ($points as $point) {
            $vals = explode(',', $point);

            $x = $vals[0];
            $y = $vals[1];

            adjust_coords($y, $x, $height, $width);

            if ($coord_type == "PIXEL") {
                $x = round($x * $width);
                $y = round($y * $height);

            } else if ($coord_type == "UTM") {
                $x = to_utm_e($x, $utm_e_upper_left, $utm_e_upper_right);
                $y = to_utm_n($y, $utm_n_upper_left, $utm_n_lower_left);

            } else if ($coord_type == "GEO") {
                $x = to_utm_e($x, $utm_e_upper_left, $utm_e_upper_right);
                $y = to_utm_n($y, $utm_n_upper_left, $utm_n_lower_left);

                $lat_lon = utm_to_lat_lon($y, $x, $utm_zone);

                $x = $lat_lon['lat'];
                $y = $lat_lon['lon'];
            }

            if ($first) {
                if ($coord_type == "PIXEL") {
                    echo "$x,$y";
                } else {
                    echo number_format($x, 4, ".", "") . "," . number_format($y, 4, ".", "");
                }
                $first = false;
            } else {
                if ($coord_type == "PIXEL") {
                    echo " $x,$y";
                } else {
                    echo " " . number_format($x, 4, ".", "") . "," . number_format($y, 4, ".", "");
                }
            }
            //echo "<br>";
        }
        echo "<br>";

    }

}


function export_rectangles($label_id, $mosaic_id, $coord_type) {
    $query = "SELECT label_name FROM labels WHERE label_id = $label_id";
    $result = query_our_db($query);
    $row = $result->fetch_assoc();
    $label_name = $row['label_name'];

    echo "#rectangles<br>";
    echo "#label: $label_name<br>";

    $query = "SELECT filename, width, height, utm_zone, utm_e_upper_left, utm_n_upper_left, utm_e_upper_right, utm_n_upper_right, utm_e_lower_left, utm_n_lower_left, utm_e_lower_right, utm_n_lower_right FROM mosaics WHERE id = $mosaic_id";
    $result = query_our_db($query);
    $row = $result->fetch_assoc();

    $width = $row['width'];
    $height = $row['height'];
    $filename = $row['filename'];
    $utm_zone = $row['utm_zone'];
    $utm_e_upper_left   = floatval($row['utm_e_upper_left']);
    $utm_e_upper_right  = floatval($row['utm_e_upper_right']);
    $utm_e_lower_left   = floatval($row['utm_e_lower_left']);
    $utm_e_lower_right  = floatval($row['utm_e_lower_right']);
    $utm_n_upper_left   = floatval($row['utm_n_upper_left']);
    $utm_n_upper_right  = floatval($row['utm_n_upper_right']);
    $utm_n_lower_left   = floatval($row['utm_n_lower_left']);
    $utm_n_lower_right  = floatval($row['utm_n_lower_right']);


    echo "#filename: $filename<br>";
    echo "#width: $width, height: $height<br>";
    echo "#utm_e_upper_left: $utm_e_upper_left<br>";
    echo "#utm_e_upper_right: $utm_e_upper_right<br>";
    echo "#utm_e_lower_left: $utm_e_lower_left<br>";
    echo "#utm_e_lower_right: $utm_e_lower_right<br>";
    echo "#utm_n_upper_left: $utm_n_upper_left<br>";
    echo "#utm_n_upper_right: $utm_n_upper_right<br>";
    echo "#utm_n_lower_left: $utm_n_lower_left<br>";
    echo "#utm_n_lower_right: $utm_n_lower_right<br>";

    $query = "SELECT * FROM rectangles WHERE mosaic_id = $mosaic_id AND label_id = $label_id";
    $result = query_our_db($query);

    echo "x1,y1,x2,y2<br>";
    while ($row = $result->fetch_assoc()) {
        $x1 = $row['x1'];
        $y1 = $row['y1'];
        adjust_coords($y1, $x1, $height, $width);

        $x2 = $row['x2'];
        $y2 = $row['y2'];
        adjust_coords($y2, $x2, $height, $width);

        if ($coord_type == "PIXEL") {
            $x1 = round($x1 * $width);
            $y1 = round($y1 * $height);

            $x2 = round($x2 * $width);
            $y2 = round($y2 * $height);

        } else if ($coord_type == "UTM") {
            $x1 = to_utm_e($x1, $utm_e_upper_left, $utm_e_upper_right);
            $y1 = to_utm_n($y1, $utm_n_upper_left, $utm_n_lower_left);

            $x2 = to_utm_e($x2, $utm_e_upper_left, $utm_e_upper_right);
            $y2 = to_utm_n($y2, $utm_n_upper_left, $utm_n_lower_left);

        } else if ($coord_type == "GEO") {
            $x1 = to_utm_e($x1, $utm_e_upper_left, $utm_e_upper_right);
            $y1 = to_utm_n($y1, $utm_n_upper_left, $utm_n_lower_left);

            $x2 = to_utm_e($x2, $utm_e_upper_left, $utm_e_upper_right);
            $y2 = to_utm_n($y2, $utm_n_upper_left, $utm_n_lower_left);

            $lat_lon = utm_to_lat_lon($y1, $x1, $utm_zone);

            $x1 = $lat_lon['lat'];
            $y1 = $lat_lon['lon'];

            $lat_lon = utm_to_lat_lon($y2, $x2, $utm_zone);

            $x2 = $lat_lon['lat'];
            $y2 = $lat_lon['lon'];
        }

        if ($coord_type == "PIXEL") {
            echo "$x1,$y1,$x2,$y2<br>";
        } else {
            echo number_format($x1, 4, ".", "") . "," . number_format($y1, 4, ".", "") . "," . number_format($x2, 4, ".", "") . "," . number_format($y2, 4, ".", "") . "<br>";
        }
    }

}

function export_lines($label_id, $mosaic_id, $coord_type) {
    $query = "SELECT label_name FROM labels WHERE label_id = $label_id";
    $result = query_our_db($query);
    $row = $result->fetch_assoc();
    $label_name = $row['label_name'];

    echo "#lines<br>";
    echo "#label: $label_name<br>";

    $query = "SELECT filename, width, height, utm_zone, utm_e_upper_left, utm_n_upper_left, utm_e_upper_right, utm_n_upper_right, utm_e_lower_left, utm_n_lower_left, utm_e_lower_right, utm_n_lower_right FROM mosaics WHERE id = $mosaic_id";
    $result = query_our_db($query);
    $row = $result->fetch_assoc();

    $width = $row['width'];
    $height = $row['height'];
    $filename = $row['filename'];
    $utm_zone = $row['utm_zone'];
    $utm_e_upper_left   = floatval($row['utm_e_upper_left']);
    $utm_e_upper_right  = floatval($row['utm_e_upper_right']);
    $utm_e_lower_left   = floatval($row['utm_e_lower_left']);
    $utm_e_lower_right  = floatval($row['utm_e_lower_right']);
    $utm_n_upper_left   = floatval($row['utm_n_upper_left']);
    $utm_n_upper_right  = floatval($row['utm_n_upper_right']);
    $utm_n_lower_left   = floatval($row['utm_n_lower_left']);
    $utm_n_lower_right  = floatval($row['utm_n_lower_right']);

    echo "#filename: $filename<br>";
    echo "#width: $width, height: $height<br>";
    echo "#utm_e_upper_left: $utm_e_upper_left<br>";
    echo "#utm_e_upper_right: $utm_e_upper_right<br>";
    echo "#utm_e_lower_left: $utm_e_lower_left<br>";
    echo "#utm_e_lower_right: $utm_e_lower_right<br>";
    echo "#utm_n_upper_left: $utm_n_upper_left<br>";
    echo "#utm_n_upper_right: $utm_n_upper_right<br>";
    echo "#utm_n_lower_left: $utm_n_lower_left<br>";
    echo "#utm_n_lower_right: $utm_n_lower_right<br>";



    $query = "SELECT * FROM `lines` WHERE mosaic_id = $mosaic_id AND label_id = $label_id";
    $result = query_our_db($query);

    echo "x1,y1,x2,y2<br>";
    while ($row = $result->fetch_assoc()) {
        $x1 = $row['x1'];
        $y1 = $row['y1'];
        adjust_coords($y1, $x1, $height, $width);

        $x2 = $row['x2'];
        $y2 = $row['y2'];
        adjust_coords($y2, $x2, $height, $width);

        if ($coord_type == "PIXEL") {
            $x1 = round($x1 * $width);
            $y1 = round($y1 * $height);

            $x2 = round($x2 * $width);
            $y2 = round($y2 * $height);

        } else if ($coord_type == "UTM") {
            $x1 = to_utm_e($x1, $utm_e_upper_left, $utm_e_upper_right);
            $y1 = to_utm_n($y1, $utm_n_upper_left, $utm_n_lower_left);

            $x2 = to_utm_e($x2, $utm_e_upper_left, $utm_e_upper_right);
            $y2 = to_utm_n($y2, $utm_n_upper_left, $utm_n_lower_left);

        } else if ($coord_type == "GEO") {
            $x1 = to_utm_e($x1, $utm_e_upper_left, $utm_e_upper_right);
            $y1 = to_utm_n($y1, $utm_n_upper_left, $utm_n_lower_left);

            $x2 = to_utm_e($x2, $utm_e_upper_left, $utm_e_upper_right);
            $y2 = to_utm_n($y2, $utm_n_upper_left, $utm_n_lower_left);

			$lat_lon = utm_to_lat_lon($y1, $x1, $utm_zone);

			$x1 = $lat_lon['lat'];
			$y1 = $lat_lon['lon'];

			$lat_lon = utm_to_lat_lon($y2, $x2, $utm_zone);

			$x2 = $lat_lon['lat'];
			$y2 = $lat_lon['lon'];
        }

		if ($coord_type == "PIXEL") {
            echo "$x1,$y1,$x2,$y2<br>";
		} else {
			echo number_format($x1, 4, ".", "") . "," . number_format($y1, 4, ".", "") . "," . number_format($x2, 4, ".", "") . "," . number_format($y2, 4, ".", "") . "<br>";
		}
	}

}


function export_points($label_id, $mosaic_id, $coord_type) {
    $query = "SELECT label_name FROM labels WHERE label_id = $label_id";
    $result = query_our_db($query);
    $row = $result->fetch_assoc();
    $label_name = $row['label_name'];

    echo "#points<br>";
    echo "#label: $label_name<br>";

    $query = "SELECT filename, width, height, utm_zone, utm_e_upper_left, utm_n_upper_left, utm_e_upper_right, utm_n_upper_right, utm_e_lower_left, utm_n_lower_left, utm_e_lower_right, utm_n_lower_right FROM mosaics WHERE id = $mosaic_id";
    $result = query_our_db($query);
    $row = $result->fetch_assoc();

    $width = $row['width'];
    $height = $row['height'];
    $filename = $row['filename'];
	$utm_zone = $row['utm_zone'];

    $utm_e_upper_left   = floatval($row['utm_e_upper_left']);
    $utm_e_upper_right  = floatval($row['utm_e_upper_right']);
    $utm_e_lower_left   = floatval($row['utm_e_lower_left']);
    $utm_e_lower_right  = floatval($row['utm_e_lower_right']);
    $utm_n_upper_left   = floatval($row['utm_n_upper_left']);
    $utm_n_upper_right  = floatval($row['utm_n_upper_right']);
    $utm_n_lower_left   = floatval($row['utm_n_lower_left']);
    $utm_n_lower_right  = floatval($row['utm_n_lower_right']);

    echo "#filename: $filename<br>";
    echo "#width: $width, height: $height<br>";
    echo "#utm_e_upper_left: $utm_e_upper_left<br>";
    echo "#utm_e_upper_right: $utm_e_upper_right<br>";
    echo "#utm_e_lower_left: $utm_e_lower_left<br>";
    echo "#utm_e_lower_right: $utm_e_lower_right<br>";
    echo "#utm_n_upper_left: $utm_n_upper_left<br>";
    echo "#utm_n_upper_right: $utm_n_upper_right<br>";
    echo "#utm_n_lower_left: $utm_n_lower_left<br>";
    echo "#utm_n_lower_right: $utm_n_lower_right<br>";


    $query = "SELECT * FROM `points` WHERE mosaic_id = $mosaic_id AND label_id = $label_id";
    $result = query_our_db($query);

    echo "cx,cy,radius<br>";
    while ($row = $result->fetch_assoc()) {
        $cx = $row['cx'];
        $cy = $row['cy'];
        adjust_coords($cy, $cx, $height, $width);

        if ($coord_type == "PIXEL") {
            $cx = round($cx * $width);
            $cy = round($cy * $height);
        } else if ($coord_type == "UTM") {
            $cx = to_utm_e($cx, $utm_e_upper_left, $utm_e_upper_right);
            $cy = to_utm_n($cy, $utm_n_upper_left, $utm_n_lower_left);
        } else if ($coord_type == "GEO") {
            $cx = to_utm_e($cx, $utm_e_upper_left, $utm_e_upper_right);
            $cy = to_utm_n($cy, $utm_n_upper_left, $utm_n_lower_left);

			$lat_lon = utm_to_lat_lon($cy, $cx, $utm_zone);

			$cy = $lat_lon['lon'];
			$cx = $lat_lon['lat'];
        }

        $radius = floatval($row['radius']) * ($utm_e_upper_right - $utm_e_upper_left);

        if ($coord_type == "PIXEL") {
            echo "$cx,$cy,$radius<br>";
        } else {
            echo number_format($cx, 4, ".", "") . "," . number_format($cy, 4, ".", "") . "," . number_format($radius, 4, ".", "") . "<br>";
        }
    }
}

?>
