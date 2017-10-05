<?php

$cwd[__FILE__] = __FILE__;
if (is_link($cwd[__FILE__])) $cwd[__FILE__] = readlink($cwd[__FILE__]);
$cwd[__FILE__] = dirname($cwd[__FILE__]);

require_once($cwd[__FILE__] . "/../db/my_query.php");
require_once($cwd[__FILE__] . "/../../Mustache.php/src/Mustache/Autoloader.php");
Mustache_Autoloader::register();

function check_project_access($user_id, $project_id) {
    global $cwd;

    $access_result = query_our_db("SELECT type FROM project_access WHERE project_id = $project_id AND user_id = $user_id");
    $access_row = $access_result->fetch_assoc();

    if ($access_row == NULL) {
        $noaccess_project_template = file_get_contents($cwd[__FILE__] . "/templates/noaccess_project_template.html");
        $noaccess_project['project_id'] = $project_id;

        $m = new Mustache_Engine;
        echo $m->render($noaccess_project_template, $noaccess_project);
        exit();
    }

    return $access_row['type'];
}

function print_unknown_project($project_id) {
    global $cwd;

    $unknown_project_template = file_get_contents($cwd[__FILE__] . "/templates/unknown_project_template.html");
    $unknown_project['project_id'] = $project_id;

    $m = new Mustache_Engine;
    echo $m->render($unknown_project_template, $unknown_project);
}

function check_mosaic_access($user_id, $project_id, $project_name, $mosaic_id) {
    global $cwd;

    $access_result = query_our_db("SELECT type FROM mosaic_access WHERE mosaic_id = $mosaic_id AND user_id = $user_id");
    $access_row = $access_result->fetch_assoc();

    if ($access_row == NULL) {
        $noaccess_mosaic_template = file_get_contents($cwd[__FILE__] . "/templates/noaccess_mosaic_template.html");
        $noaccess_mosaic['project_id'] = $project_id;
        $noaccess_mosaic['project_name'] = $project_name;
        $noaccess_mosaic['mosaic_id'] = $mosaic_id;

        $m = new Mustache_Engine;
        echo $m->render($noaccess_mosaic_template, $noaccess_mosaic);
        exit();
    }

    return $access_row['type'];
}

function print_unknown_mosaic($project_id, $project_name, $mosaic_id) {
    global $cwd;

    $unknown_mosaic_template = file_get_contents($cwd[__FILE__] . "/templates/unknown_mosaic_template.html");

    $unknown_mosaic['project_id'] = $project_id;
    $unknown_mosaic['project_name'] = $project_name;
    $unknown_mosaic['mosaic_id'] = $mosaic_id;

    $m = new Mustache_Engine;
    echo $m->render($unknown_mosaic_template, $unknown_mosaic);
}

?>
