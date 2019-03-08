<?php
$cwd[__FILE__] = __FILE__;
if (is_link($cwd[__FILE__])) $cwd[__FILE__] = readlink($cwd[__FILE__]);
$cwd[__FILE__] = dirname($cwd[__FILE__]);

require_once($cwd[__FILE__] . "/../db/my_query.php");

/*
$mosaic_id = $argv[1];
$label_id = $argv[2];

echo "#mosaic_id: $mosaic_id\n";
echo "#label_id: $label_id\n";
 */

function export_polygons($label_id, $mosaic_id) {
    $query = "SELECT label_name FROM labels WHERE label_id = $label_id";
    $result = query_our_db($query);
    $row = $result->fetch_assoc();
    $label_name = $row['label_name'];

    echo "#label: $label_name<br>";

    $query = "SELECT filename, width, height, utm_e_upper_left, utm_n_upper_left, utm_e_upper_right, utm_n_upper_right, utm_e_lower_left, utm_n_lower_left, utm_e_lower_right, utm_n_lower_right FROM mosaics WHERE id = $mosaic_id";
    $result = query_our_db($query);
    $row = $result->fetch_assoc();

    $width = $row['width'];
    $height = $row['height'];
    $filename = $row['filename'];
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
            $x = floatval($vals[0]);
            $y = floatval($vals[1]);

            //echo "$x, $y ==> ";

            $x = $utm_e_upper_left + ($x * ($utm_e_upper_left - $utm_e_upper_right));
            $y = $utm_n_upper_left + ($y * ($utm_n_upper_left - $utm_n_lower_left));

            if ($first) {
                echo "$x,$y";
                $first = false;
            } else {
                echo " $x,$y";
            }
            //echo "<br>";
        }
        echo "<br>";

    }

}


function export_rectangles($label_id, $mosaic_id) {
    $query = "SELECT label_name FROM labels WHERE label_id = $label_id";
    $result = query_our_db($query);
    $row = $result->fetch_assoc();
    $label_name = $row['label_name'];

    echo "#label: $label_name<br>";

    $query = "SELECT filename, width, height, utm_e_upper_left, utm_n_upper_left, utm_e_upper_right, utm_n_upper_right, utm_e_lower_left, utm_n_lower_left, utm_e_lower_right, utm_n_lower_right FROM mosaics WHERE id = $mosaic_id";
    $result = query_our_db($query);
    $row = $result->fetch_assoc();

    $width = $row['width'];
    $height = $row['height'];
    $filename = $row['filename'];
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
        $x1 = $utm_e_upper_left + (floatval($row['x1']) * ($utm_e_upper_left - $utm_e_lower_right));
        $x2 = $utm_e_upper_left + (floatval($row['x2']) * ($utm_e_upper_left - $utm_e_upper_right));
        $y1 = $utm_n_upper_left + (floatval($row['y1']) * ($utm_n_upper_left - $utm_n_lower_left));
        $y2 = $utm_n_upper_left + (floatval($row['y2']) * ($utm_n_upper_left - $utm_n_lower_left));

        echo "$x1,$y2,$x2,$y2<br>";
    }

}

function export_lines($label_id, $mosaic_id) {
    $query = "SELECT label_name FROM labels WHERE label_id = $label_id";
    $result = query_our_db($query);
    $row = $result->fetch_assoc();
    $label_name = $row['label_name'];

    echo "#label: $label_name<br>";

    $query = "SELECT filename, width, height, utm_e_upper_left, utm_n_upper_left, utm_e_upper_right, utm_n_upper_right, utm_e_lower_left, utm_n_lower_left, utm_e_lower_right, utm_n_lower_right FROM mosaics WHERE id = $mosaic_id";
    $result = query_our_db($query);
    $row = $result->fetch_assoc();

    $width = $row['width'];
    $height = $row['height'];
    $filename = $row['filename'];
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
        $x1 = $utm_e_upper_left + (floatval($row['x1']) * ($utm_e_upper_left - $utm_e_lower_right));
        $x2 = $utm_e_upper_left + (floatval($row['x2']) * ($utm_e_upper_left - $utm_e_upper_right));
        $y1 = $utm_n_upper_left + (floatval($row['y1']) * ($utm_n_upper_left - $utm_n_lower_left));
        $y2 = $utm_n_upper_left + (floatval($row['y2']) * ($utm_n_upper_left - $utm_n_lower_left));

        echo "$x1,$y2,$x2,$y2<br>";
    }

}


function export_points($label_id, $mosaic_id) {
    $query = "SELECT label_name FROM labels WHERE label_id = $label_id";
    $result = query_our_db($query);
    $row = $result->fetch_assoc();
    $label_name = $row['label_name'];

    echo "#label: $label_name<br>";

    $query = "SELECT filename, width, height, utm_e_upper_left, utm_n_upper_left, utm_e_upper_right, utm_n_upper_right, utm_e_lower_left, utm_n_lower_left, utm_e_lower_right, utm_n_lower_right FROM mosaics WHERE id = $mosaic_id";
    $result = query_our_db($query);
    $row = $result->fetch_assoc();

    $width = $row['width'];
    $height = $row['height'];
    $filename = $row['filename'];
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
        $cx = $utm_e_upper_left + (floatval($row['cx']) * ($utm_e_upper_left - $utm_e_upper_right));
        $cy = $utm_n_upper_left + (floatval($row['cy']) * ($utm_n_upper_left - $utm_n_lower_left));

        $cx = intval($row['cx'] * $width);
        $cy = intval($row['cy'] * $width);
        $radius = floatval($row['radius']) * ($utm_e_upper_left - $utm_e_upper_right);

        echo "$cx,$cy,$radius<br>";
    }

}



?>
