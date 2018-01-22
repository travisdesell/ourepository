<?php

$cwd[__FILE__] = __FILE__;
if (is_link($cwd[__FILE__])) $cwd[__FILE__] = readlink($cwd[__FILE__]);
$cwd[__FILE__] = dirname($cwd[__FILE__]);

require_once($cwd[__FILE__] . "/../db/my_query.php");
require_once($cwd[__FILE__] . "/../../Mustache.php/src/Mustache/Autoloader.php");
Mustache_Autoloader::register();

function create_points($user_id, $mosaic_id, $label_id, $points) {
    global $our_db, $cwd;

    $point_ids = array();
    foreach ($points as $point) {
        $cx = $our_db->real_escape_string($point['cx']);
        $cy = $our_db->real_escape_string($point['cy']);
        $radius = $our_db->real_escape_string($point['radius']);

        $query = "INSERT INTO points SET owner_id = $user_id, mosaic_id = $mosaic_id, label_id = $label_id, cx = $cx, cy = $cy, radius = $radius";
        error_log($query);
        query_our_db($query);
        $point_id = $our_db->insert_id;
        $point_ids[] = $point_id;

        $point = array(
            'label_id' => $label_id,
            'point_id' => $point_id,
            'cx' => $cx,
            'cy' => $cy,
            'visible' => true
        );
        $point_template = file_get_contents($cwd[__FILE__] . "/templates/point_template.html");
        $m = new Mustache_Engine;
        $point_htmls[] = $m->render($point_template, $point);
    }

    $response['point_ids'] = $point_ids;
    $response['point_htmls'] = $point_htmls;

    echo json_encode($response);
}

function create_lines($user_id, $mosaic_id, $label_id, $lines) {
    global $our_db, $cwd;

    $line_ids = array();
    foreach ($lines as $line) {
        $x1 = $our_db->real_escape_string($line['x1']);
        $x2 = $our_db->real_escape_string($line['x2']);
        $y1 = $our_db->real_escape_string($line['y1']);
        $y2 = $our_db->real_escape_string($line['y2']);

        //seems like lines is a reserved word in mysql so we have to ` escape it
        $query = "INSERT INTO `lines` SET owner_id = $user_id, mosaic_id = $mosaic_id, label_id = $label_id, x1 = $x1, x2 = $x2, y1 = $y1, y2 = $y2";
        error_log($query);
        query_our_db($query);
        $line_id = $our_db->insert_id;
        $line_ids[] = $line_id;

        $line = array(
            'label_id' => $label_id,
            'line_id' => $line_id,
            'x1' => $x1,
            'y1' => $y1,
            'x2' => $x2,
            'y2' => $y2,
            'visible' => true
        );
        $line_template = file_get_contents($cwd[__FILE__] . "/templates/line_template.html");
        $m = new Mustache_Engine;
        $line_htmls[] = $m->render($line_template, $line);
    }

    $response['line_ids'] = $line_ids;
    $response['line_htmls'] = $line_htmls;

    echo json_encode($response);
}

function create_polygon_points($points_str) {
    $points = array();

    $p_array = explode(' ', $points_str);

    $n = 1;
    foreach($p_array as $p) {
        $vals = explode(',', $p);
        $x = $vals[0];
        $y = $vals[1];

        $point = array(
            "y" => $y,
            "x" => $x,
            "n" => $n);

        $points[] = $point;
        $n++;
    }

    return $points;
}

function create_polygon($user_id, $mosaic_id, $label_id, $points_str) {
    global $our_db, $cwd;

    $query = "INSERT INTO polygons SET owner_id = $user_id, mosaic_id = $mosaic_id, label_id = $label_id, points_str = '$points_str'";
    error_log($query);
    query_our_db($query);
    $polygon_id = $our_db->insert_id;

    $response['polygon_id'] = $polygon_id;
    $response['points_str'] = $points_str;

    $polygon = array(
        'label_id' => $label_id,
        'polygon_id' => $polygon_id,
        'points_str' => $points_str,
        'points' => create_polygon_points($points_str),
        'visible' => true
    );
    $polygon_template = file_get_contents($cwd[__FILE__] . "/templates/polygon_template.html");
    $m = new Mustache_Engine;
    $response['polygon_html'] = $m->render($polygon_template, $polygon);

    echo json_encode($response);
}

function remove_point($user_id, $mosaic_id, $point_id) {
    global $our_db, $cwd;

    $query = "DELETE FROM points WHERE owner_id = $user_id AND mosaic_id = $mosaic_id AND point_id = $point_id";
    error_log($query);
    query_our_db($query);

    $response['success'] = true;

    echo json_encode($response);
}

function remove_line($user_id, $mosaic_id, $line_id) {
    global $our_db, $cwd;

    $query = "DELETE FROM `lines` WHERE owner_id = $user_id AND mosaic_id = $mosaic_id AND line_id = $line_id";
    error_log($query);
    query_our_db($query);

    $response['success'] = true;

    echo json_encode($response);
}

function remove_polygon($user_id, $mosaic_id, $polygon_id) {
    global $our_db, $cwd;

    $query = "DELETE FROM polygons WHERE owner_id = $user_id AND mosaic_id = $mosaic_id AND polygon_id = $polygon_id";
    error_log($query);
    query_our_db($query);

    $response['success'] = true;

    echo json_encode($response);
}

?>
