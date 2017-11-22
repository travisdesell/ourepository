<?php

$cwd[__FILE__] = __FILE__;
if (is_link($cwd[__FILE__])) $cwd[__FILE__] = readlink($cwd[__FILE__]);
$cwd[__FILE__] = dirname($cwd[__FILE__]);

require_once($cwd[__FILE__] . "/../db/my_query.php");
require_once($cwd[__FILE__] . "/user.php");


// Get $id_token via HTTPS POST.
$id_token = $_POST['id_token'];
$request_type = $_POST['request'];

//Get our user ID for this email, create a new user if this user
//has not logged in before.
$user_id = get_user_id($id_token);

if ($request_type == NULL || $request_type == "INDEX") {
    require_once($cwd[__FILE__] . "/projects.php");
    display_projects($user_id);

} else if ($request_type == "ADDPROJECT") {
    require_once($cwd[__FILE__] . "/projects.php");

    $project_name = $our_db->real_escape_string($_POST['project_name']);
    add_project($user_id, $project_name);
    display_projects($user_id);

} else if ($request_type == "MOSAICS") {
    require_once($cwd[__FILE__] . "/mosaics.php");
    $project_id = $our_db->real_escape_string($_POST['project_id']);

    display_mosaics($user_id, $project_id);
} else if ($request_type == "MOSAIC") {
    require_once($cwd[__FILE__] . "/mosaic.php");
    $project_id = $our_db->real_escape_string($_POST['project_id']);
    $mosaic_id = $our_db->real_escape_string($_POST['mosaic_id']);

    error_log("project_id: $project_id, mosaic_id: $mosaic_id");

    display_mosaic($user_id, $project_id, $mosaic_id);
} else if ($request_type == "PROCESS") {
    require_once($cwd[__FILE__] . "/process_mosaic.php");

}

?>
