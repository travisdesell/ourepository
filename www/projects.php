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

    $project_result = query_our_db("select projects.id, projects.name from projects, project_access where projects.id = project_access.project_id AND project_access.user_id = $user_id");

    $projects['projects'] = array();

    while (($project_row = $project_result->fetch_assoc()) != NULL) {
        $projects['projects'][] = $project_row;
    }

    $mosaic_result = query_our_db("SELECT id, filename, identifier, total_size, bytes_uploaded, status, height, width FROM mosaics WHERE owner_id = $user_id ORDER BY filename");

    $projects['mosaics'] = array();

    while (($mosaic_row = $mosaic_result->fetch_assoc()) != NULL) {
        $mosaic_row['project_id'] = $project_id;
        $mosaic_row['percentage'] = number_format($mosaic_row['bytes_uploaded'] * 100 / $mosaic_row['total_size'], 2);
        $mosaic_row['bytes_uploaded'] = number_format($mosaic_row['bytes_uploaded'] / 1024, 0);
        $mosaic_row['total_size'] = number_format($mosaic_row['total_size'] / 1024, 0);

        if ($mosaic_row['status'] == "UPLOADING") {
            $mosaic_row['uploading'] = true;
        } else if ($mosaic_row['status'] == "UPLOADED") {
            $mosaic_row['uploaded'] = true;
        } else if ($mosaic_row['status'] == "TILED") {
            $mosaic_row['tiled'] = true;
        }

        $projects['mosaics'][] = $mosaic_row;
    }

    $projects_template = file_get_contents($cwd[__FILE__] . "/templates/projects_template.html");

    $m = new Mustache_Engine;
    $response['html'] = $m->render($projects_template, $projects);

    echo json_encode($response);
}

?>

