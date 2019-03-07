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

    $query = "SELECT filename, width, height FROM mosaics WHERE id = $mosaic_id";
    $result = query_our_db($query);
    $row = $result->fetch_assoc();

    $width = $row['width'];
    $height = $row['height'];
    $filename = $row['filename'];

    echo "#filename: $filename<br>";
    echo "#width: $width, height: $height<br>";


    $query = "SELECT * FROM polygons WHERE mosaic_id = $mosaic_id AND label_id = $label_id";
    $result = query_our_db($query);

    echo "x1,y1 x2,y2 x3,y3 ... xn,yn<br>";
    while ($row = $result->fetch_assoc()) {
        $points_str = $row['points_str'];

        echo "$points_str<br>";
    }

}


function export_rectangles($label_id, $mosaic_id) {
    $query = "SELECT label_name FROM labels WHERE label_id = $label_id";
    $result = query_our_db($query);
    $row = $result->fetch_assoc();
    $label_name = $row['label_name'];

    echo "#label: $label_name<br>";

    $query = "SELECT filename, width, height FROM mosaics WHERE id = $mosaic_id";
    $result = query_our_db($query);
    $row = $result->fetch_assoc();

    $width = $row['width'];
    $height = $row['height'];
    $filename = $row['filename'];

    echo "#filename: $filename<br>";
    echo "#width: $width, height: $height<br>";


    $query = "SELECT * FROM rectangles WHERE mosaic_id = $mosaic_id AND label_id = $label_id";
    $result = query_our_db($query);

    echo "x1,y1,x2,y2<br>";
    while ($row = $result->fetch_assoc()) {
        $x1 = intval($row['x1'] * $width);
        $x2 = intval($row['x2'] * $width);
        $y1 = intval($row['y1'] * $width);
        $y2 = intval($row['y2'] * $width);

        echo "$x1,$y2,$x2,$y2<br>";
    }

}

function export_lines($label_id, $mosaic_id) {
    $query = "SELECT label_name FROM labels WHERE label_id = $label_id";
    $result = query_our_db($query);
    $row = $result->fetch_assoc();
    $label_name = $row['label_name'];

    echo "#label: $label_name<br>";

    $query = "SELECT filename, width, height FROM mosaics WHERE id = $mosaic_id";
    $result = query_our_db($query);
    $row = $result->fetch_assoc();

    $width = $row['width'];
    $height = $row['height'];
    $filename = $row['filename'];

    echo "#filename: $filename<br>";
    echo "#width: $width, height: $height<br>";


    $query = "SELECT * FROM `lines` WHERE mosaic_id = $mosaic_id AND label_id = $label_id";
    $result = query_our_db($query);

    echo "x1,y1,x2,y2<br>";
    while ($row = $result->fetch_assoc()) {
        $x1 = intval($row['x1'] * $width);
        $x2 = intval($row['x2'] * $width);
        $y1 = intval($row['y1'] * $width);
        $y2 = intval($row['y2'] * $width);

        echo "$x1,$y2,$x2,$y2<br>";
    }

}


function export_points($label_id, $mosaic_id) {
    $query = "SELECT label_name FROM labels WHERE label_id = $label_id";
    $result = query_our_db($query);
    $row = $result->fetch_assoc();
    $label_name = $row['label_name'];

    echo "#label: $label_name<br>";

    $query = "SELECT filename, width, height FROM mosaics WHERE id = $mosaic_id";
    $result = query_our_db($query);
    $row = $result->fetch_assoc();

    $width = $row['width'];
    $height = $row['height'];
    $filename = $row['filename'];

    echo "#filename: $filename<br>";
    echo "#width: $width, height: $height<br>";


    $query = "SELECT * FROM `points` WHERE mosaic_id = $mosaic_id AND label_id = $label_id";
    $result = query_our_db($query);

    echo "cx,cy,radius<br>";
    while ($row = $result->fetch_assoc()) {
        $cx = intval($row['cx'] * $width);
        $cy = intval($row['cy'] * $width);
        $radius = intval($row['radius'] * $width);

        echo "$cx,$cy,$radius<br>";
    }

}



?>
