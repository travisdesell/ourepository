<?php

$cwd[__FILE__] = __FILE__;
if (is_link($cwd[__FILE__])) $cwd[__FILE__] = readlink($cwd[__FILE__]);
$cwd[__FILE__] = dirname($cwd[__FILE__]);

require_once($cwd[__FILE__] . "/../db/my_query.php");
require_once($cwd[__FILE__] . "/access_checks.php");
require_once($cwd[__FILE__] . "/../../Mustache.php/src/Mustache/Autoloader.php");
Mustache_Autoloader::register();

function display_mosaic($user_id, $project_id, $mosaic_id) {
    global $cwd;

    $project_id = 1;

    if ($project_id == '') {
        //check and see if the mosaic exists
        $mosaic_result = query_our_db("SELECT owner_id, filename, width, height FROM mosaics WHERE id = $mosaic_id");
        $mosaic_row = $mosaic_result->fetch_assoc();
        if ($mosaic_row == NULL) {
            print_unknown_mosaic($project_id, $project_name, $mosaic_id);
            return;
        }

        //check and see if the user has access to it

        $filename = $mosaic_row['filename']; 
        $width = $mosaic_row['width']; 
        $height = $mosaic_row['height'];

        $filename = substr($filename, 0, -4);
        $response['mosaic_url'] = './mosaics/' . $filename . '_files/';
        $response['height'] = $height;
        $response['width'] = $width;

        $mosaic['no_project'] = true;
        $mosaic['mosaic_name'] = $filename;

        $mosaic_template = file_get_contents($cwd[__FILE__] . "/templates/mosaic_template.html");

        $m = new Mustache_Engine;
        $response['html'] = $m->render($mosaic_template, $mosaic);

        echo json_encode($response);
     } else {

        check_project_access($user_id, $project_id);

        $project_result = query_our_db("SELECT name FROM projects WHERE id = $project_id");
        $project_row = $project_result->fetch_assoc();
        if ($project_row == NULL) {
            //project does not exist
            print_unknown_project($project_id);
            return;
        }

        $project_name = $project_row['name'];
        $mosaic['project_name'] = $project_name;
        $mosaic['project_id'] = $project_id;

        check_mosaic_access($user_id, $project_id, $project_name, $mosaic_id);

        //check and see if the mosaic exists
        $mosaic_result = query_our_db("SELECT owner_id, filename, width, height FROM mosaics WHERE id = $mosaic_id");
        $mosaic_row = $mosaic_result->fetch_assoc();
        if ($mosaic_row == NULL) {
            print_unknown_mosaic($project_id, $project_name, $mosaic_id);
            return;
        }

        //check and see if the user has access to it

        $filename = $mosaic_row['filename']; 
        $width = $mosaic_row['width']; 
        $height = $mosaic_row['height'];

        $filename = substr($filename, 0, -4);
        $response['mosaic_url'] = './mosaics/' . $filename . '_files/';
        $response['height'] = $height;
        $response['width'] = $width;

        $mosaic['mosaic_name'] = $filename;

        $mosaic_template = file_get_contents($cwd[__FILE__] . "/templates/mosaic_template.html");

        $m = new Mustache_Engine;
        $response['html'] = $m->render($mosaic_template, $mosaic);

        echo json_encode($response);
    }
}

/*
$mosaic_info .= "var points = [";

$points_file = fopen("./mosaics/points_" . $name . ".csv", "r");
if ($points_file) {
    $first = true;

    $line = fgets($points_file); //skip the first line

    while (($line = fgets($points_file)) !== false) {
        if ($first) {
            $first = false;
        } else {
            $mosaic_info .= ", ";
        }
        $mosaic_info .= "[" . substr($line, 0, -1) . "]";
    }
}
fclose($points_file);

$mosaic_info .= "];\n";

$mosaic_info .= "var lines = [";

$lines_file = fopen("./mosaics/lines_" . $name . ".csv", "r");
if ($lines_file) {
    $first = true;

    $line = fgets($lines_file); //skip the first line

    while (($line = fgets($lines_file)) !== false) {
        if ($first) {
            $first = false;
        } else {
            $mosaic_info .= ", ";
        }
        $mosaic_info .= "[" . substr($line, 0, -1) . "]";
    }
}
fclose($lines_file);

$mosaic_info .= "];";
 */
