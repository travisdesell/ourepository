<?php

$cwd[__FILE__] = __FILE__;
if (is_link($cwd[__FILE__])) $cwd[__FILE__] = readlink($cwd[__FILE__]);
$cwd[__FILE__] = dirname($cwd[__FILE__]);

require_once($cwd[__FILE__] . "/../db/my_query.php");
require_once($cwd[__FILE__] . "/../../Mustache.php/src/Mustache/Autoloader.php");
Mustache_Autoloader::register();

function add_project($user_id, $project_name) {
    global $cwd, $our_db;

    //TODO check and see if project already exists, report error if it does

    query_our_db("INSERT INTO projects SET owner_id = $user_id, name = '$project_name'");
    $project_id = $our_db->insert_id;

    query_our_db("INSERT INTO project_access SET user_id = $user_id, project_id = $project_id, type ='rw'");
}

function display_projects($user_id) {
    global $cwd;

    $project_result = query_our_db("SELECT id, name FROM projects WHERE owner_id = $user_id");

    $projects['projects'] = array();

    while (($project_row = $project_result->fetch_assoc()) != NULL) {
        $projects['projects'][] = $project_row;
    }

    $projects_template = file_get_contents($cwd[__FILE__] . "/templates/projects_template.html");

    $m = new Mustache_Engine;
    echo $m->render($projects_template, $projects);
}

?>

