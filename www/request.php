<?php

$cwd[__FILE__] = __FILE__;
if (is_link($cwd[__FILE__])) $cwd[__FILE__] = readlink($cwd[__FILE__]);
$cwd[__FILE__] = dirname($cwd[__FILE__]);

require_once($cwd[__FILE__] . "/../db/my_query.php");
require_once($cwd[__FILE__] . "/user.php");

/*
error_log("BEFORE GET USER ID!");
foreach ($_FILES as $file) {
    error_log("file: " . json_encode($file));
}

foreach ($_GET as $key => $value) {
    error_log("_GET['$key']: '$value'");
}

foreach ($_POST as $key => $value) {
    error_log("_POST['$key']: '$value'");
}
 */

// Get $id_token via HTTPS POST.
$id_token = $_POST['id_token'];
$request_type = $_POST['request'];

error_log("request is: $request_type");
//error_log("id_token: '$id_token'");

//Get our user ID for this email, create a new user if this user
//has not logged in before.
$user_id = get_user_id($id_token);

error_log("got user id: $user_id");

if ($request_type == NULL || $request_type == "INDEX") {
    require_once($cwd[__FILE__] . "/mosaics.php");
    display_index($user_id);

} else if ($request_type == "MOSAIC_CARD") {
    require_once($cwd[__FILE__] . "/mosaics.php");

    $mosaic_id = $our_db->real_escape_string($_POST['mosaic_id']);
    $response['html'] = get_finished_mosaic_card($user_id, $mosaic_id);

    echo json_encode($response);

} else if ($request_type == "MOSAIC") {
    error_log("request type is mosaic!");

    require_once($cwd[__FILE__] . "/mosaics.php");

    $mosaic_id = $our_db->real_escape_string($_POST['mosaic_id']);

    error_log("mosaic_id: '$mosaic_id'");

    display_mosaic($user_id, $mosaic_id);

} else if ($request_type == "NEW_UPLOAD") {
    require_once($cwd[__FILE__] . "/upload.php");

    initiate_upload($user_id);

} else if ($request_type == "UPLOAD") {
    require_once($cwd[__FILE__] . "/upload.php");

    process_chunk($user_id);
} else if ($request_type == "TILE_PROGRESS") {
    require_once($cwd[__FILE__] . "/upload.php");

    $md5_hash = $our_db->real_escape_string($_POST['md5_hash']);
    $mosaic_info = get_mosaic_info($md5_hash);

    $response['html'] = "success!";
    $response['mosaic_info'] = $mosaic_info;

    echo json_encode($response);
} else if ($request_type == "DELETE_MOSAIC") {
    require_once($cwd[__FILE__] . "/upload.php");

    $md5_hash = $our_db->real_escape_string($_POST['md5_hash']);
    $mosaic_id = $our_db->real_escape_string($_POST['mosaic_id']);

    error_log("trying to delete a mosaic with md5_hash: '$md5_hash' and id: $mosaic_id");

    $query = "SELECT filename, identifier FROM mosaics WHERE owner_id = $user_id AND md5_hash = '$md5_hash' AND id = '$mosaic_id'";
    error_log($query);
    $result = query_our_db($query);
    $row = $result->fetch_assoc();

    $filename = $row['filename'];
    $identifier = $row['identifier'];
    $upload_dir = "/mosaic_uploads/$user_id/$identifier/";

    error_log("recursively deleting directory $upload_dir");
    rrmdir($upload_dir);
    error_log("unlinking file: '/mosaic_uploads/$user_id/$filename'");
    unlink("/mosaic_uploads/$user_id/$filename");

    $filename_base = substr($filename, 0, strrpos($filename, "."));
    $thumbnail_filename = $filename_base . "_thumbnail.png";

    $tile_dir = "/mosaics/$user_id/$filename_base" . "_files";
    rrmdir($tile_dir);
    unlink("/mosaics/$user_id/$filename_base" . ".dzi");
    unlink("/mosaics/$user_id/$filename_base" . "_thumbnail.png");


    $query = "DELETE FROM mosaics WHERE owner_id = $user_id AND md5_hash ='$md5_hash' AND id = '$mosaic_id'";
    query_our_db($query);
    //TODO delete mosaic access records as well


    $response['html'] = 'success!';
    echo json_encode($response);
}
