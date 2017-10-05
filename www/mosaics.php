<?php

$cwd[__FILE__] = __FILE__;
if (is_link($cwd[__FILE__])) $cwd[__FILE__] = readlink($cwd[__FILE__]);
$cwd[__FILE__] = dirname($cwd[__FILE__]);

require_once($cwd[__FILE__] . "/../db/my_query.php");
require_once($cwd[__FILE__] . "/access_checks.php");
require_once($cwd[__FILE__] . "/../../Mustache.php/src/Mustache/Autoloader.php");
Mustache_Autoloader::register();


function display_mosaics($user_id, $project_id) {
    global $cwd;

    check_project_access($user_id, $project_id);

    $name_result = query_our_db("SELECT name FROM projects WHERE id = $project_id");
    $name_row = $name_result->fetch_assoc();
    if ($name_row == NULL) {
        print_unknown_project($project_id);
        return;
    }

    $project_name = $name_row['name'];

    $mosaics['project_name'] = $project_name;

    //TODO: select mosaics via which ones user has access to
    $mosaic_result = query_our_db("SELECT id, filename, height, width FROM mosaics INNER JOIN mosaic_access ON mosaics.id = mosaic_access.mosaic_id AND mosaic_access.user_id = $user_id AND mosaics.project_id = $project_id");

    $mosaics['mosaics'] = array();

    while (($mosaic_row = $mosaic_result->fetch_assoc()) != NULL) {
        $mosaic_row['project_id'] = $project_id;
        $mosaics['mosaics'][] = $mosaic_row;
    }

    $mosaics_template = file_get_contents($cwd[__FILE__] . "/templates/mosaics_template.html");

    $m = new Mustache_Engine;
    echo $m->render($mosaics_template, $mosaics);
}

?>
