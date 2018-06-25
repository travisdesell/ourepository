<?php

$cwd[__FILE__] = __FILE__;
if (is_link($cwd[__FILE__])) $cwd[__FILE__] = readlink($cwd[__FILE__]);
$cwd[__FILE__] = dirname($cwd[__FILE__]);

require_once($cwd[__FILE__] . "/../db/my_query.php");
require_once($cwd[__FILE__] . "/../../Mustache.php/src/Mustache/Autoloader.php");
Mustache_Autoloader::register();

function get_predictions($user_id, $job_id, $mosaic_id, $label_id) {
    global $our_db, $cwd;

    $prediction_query = "SELECT * FROM prediction WHERE owner_id = $user_id AND job_id = $job_id AND mosaic_id = $mosaic_id AND label_id = $label_id";
    $prediction_result = query_our_db($prediction_query);

    $label_query = "SELECT label_type FROM labels WHERE label_id = $label_id";
    $label_result = query_our_db($label_query);
    $label_row = $label_result->fetch_assoc();
    $label_type = $label_row['label_type'];

    $mark_counts = 0;

    $predictions = array();
    $mark_attributes = array();
    while (($p_row = $prediction_result->fetch_assoc()) != NULL) {
        $mark_id = $p_row['mark_id'];

        if ($label_type == "POINT") {
            $point_query = "SELECT cx, cy FROM points WHERE point_id = $mark_id";
            $point_result = query_our_db($point_query);
            $point_row = $point_result->fetch_assoc();
            $p_row['cx'] = $point_row['cx'];
            $p_row['cy'] = $point_row['cy'];

            $p_row['prediction'] = 1.0 - $p_row['prediction'];

        } else if ($label_type == "LINE") {
            $line_query = "SELECT x1, x2, y1, y2 FROM `lines` WHERE line_id = $mark_id";
            $line_result = query_our_db($line_query);
            $line_row = $line_result->fetch_assoc();
            $p_row['x1'] = $line_row['x1'];
            $p_row['x2'] = $line_row['x2'];
            $p_row['y1'] = $line_row['y1'];
            $p_row['y2'] = $line_row['y2'];

        }

        $predictions[] = $p_row;

        $mark_attributes[$mark_id] = array();

        $mark_query = "SELECT * from mark_attributes WHERE mark_id = $mark_id";
        $mark_result = query_our_db($mark_query);

        while (($m_row = $mark_result->fetch_assoc()) != NULL) {
            $mark_attributes[$mark_id][] = $m_row;
            $mark_counts = $mark_counts + 1;
        }
    }

    $response['predictions'] = $predictions;
    $response['mark_attributes'] = $mark_attributes;

    if ($mark_counts > 0) $response['has_mark_attributes'] = true;
    else $response['has_mark_attributes'] = false;

    echo json_encode($response);
}

?>
