<?php

$cwd[__FILE__] = __FILE__;
if (is_link($cwd[__FILE__])) $cwd[__FILE__] = readlink($cwd[__FILE__]);
$cwd[__FILE__] = dirname($cwd[__FILE__]);

require_once($cwd[__FILE__] . "/../db/my_query.php");
require_once($cwd[__FILE__] . "/../../Mustache.php/src/Mustache/Autoloader.php");
Mustache_Autoloader::register();

function ordinal_suffix($num) {
    $num = $num % 100; // protect against large numbers
    if ($num < 11 || $num > 13) {
        switch($num % 10){
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        }
    }
    return 'th';
}

function display_mosaics($user_id) {
    global $cwd;

    $projects['all_mosaics'] = array();

    $projects['finished_mosaics'] = array();
    $mosaic_result = query_our_db("SELECT * FROM mosaics WHERE owner_id = $user_id AND status = 'TILED' ORDER BY filename");
    while (($mosaic_row = $mosaic_result->fetch_assoc()) != NULL) {
        $mosaic_row['size_kb'] = number_format($mosaic_row['size_bytes'] / 1024, 0);

        if ($mosaic_row['geotiff'] == 0) {
            unset($mosaic_row['geotiff']);
        }

        $filename = $mosaic_row['filename'];
        $filename_base = substr($filename, 0, strrpos($filename, "."));            
        $thumbnail_filename = $filename_base . "_thumbnail.png";
        $mosaic_row['thumbnail'] = $thumbnail_filename;

        $preview_filename = $filename_base . "_preview.png";
        $mosaic_row['preview'] = $preview_filename;

        $projects['finished_mosaics'][] = $mosaic_row;
        $projects['all_mosaics'][] = $mosaic_row;
    }


    $mosaic_result = query_our_db("SELECT * FROM mosaics WHERE owner_id = $user_id AND status != 'TILED' ORDER BY filename");

    $projects['mosaics'] = array();

    while (($mosaic_row = $mosaic_result->fetch_assoc()) != NULL) {
        $mosaic_row['project_id'] = $project_id;
        $mosaic_row['percentage'] = number_format($mosaic_row['bytes_uploaded'] * 100 / $mosaic_row['size_bytes'], 2);
        $mosaic_row['bytes_uploaded'] = number_format($mosaic_row['bytes_uploaded'] / 1024, 0);
        $mosaic_row['size_bytes'] = number_format($mosaic_row['size_bytes'] / 1024, 0);

        if ($mosaic_row['status'] == "UPLOADING") {
            $mosaic_row['status_text'] = 'upload incomplete';
            $mosaic_row['uploading'] = true;
        } else if ($mosaic_row['status'] == "UPLOADED") {
            $queue_query = "SELECT count(id) FROM mosaics WHERE status = 'UPLOADED' AND id < " . $mosaic_row['id'];
            error_log($queue_query);
            $queue_result = query_our_db($queue_query);
            $queue_row = $queue_result->fetch_assoc();
            $queue_length = $queue_row['count(id)'] + 1;

            $queue_length .= ordinal_suffix($queue_length);


            $mosaic_row['status_text'] = "$queue_length in tiling queue";
            $mosaic_row['uploaded'] = true;
        } else if ($mosaic_row['status'] == "TILING") {
            $mosaic_row['status_text'] = 'tiling';
            $mosaic_row['tiling'] = true;
            $mosaic_row['percentage'] = number_format($mosaic_row['tiling_progress'], 2);
        }

        $projects['mosaics'][] = $mosaic_row;
        $projects['all_mosaics'][] = $mosaic_row;
    }

    $projects_template = file_get_contents($cwd[__FILE__] . "/templates/mosaics_template.html");

    $m = new Mustache_Engine;
    $response['html'] = $m->render($projects_template, $projects);
    $response['mosaics'] = $projects['all_mosaics'];

    echo json_encode($response);
}

?>

