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
if (isset($_POST['id_token'])) {
    $id_token = $_POST['id_token'];
    $request_type = $_POST['request'];
} else {
    $id_token = $_GET['id_token'];
    $request_type = $_GET['request'];
}

//error_log("request is: $request_type");
//error_log("id_token: '$id_token'");

//Get our user ID for this email, create a new user if this user
//has not logged in before.
$user_id = get_user_id($id_token);

//error_log("got user id: $user_id");

function escape_array($array) {
    global $our_db;

    $new_array = array();
    foreach ($array as $item) {
        $new_array[] = $our_db->real_escape_string($item);
    }
    return $new_array;
}


if ($request_type == NULL || $request_type == "INDEX") {
    require_once($cwd[__FILE__] . "/mosaics.php");
    display_index($user_id);

} else if ($request_type == "TILE") {
    // open the file in a binary mode
    // tiles come as GETs not POSTs

    $name = $_GET['file'];
    $mosaic_id = $_GET['mosaic_id'];
    //TODO: check and see if user has access to this mosaic

    //error_log("got a request for a tile: '$name'");
    $fp = fopen($name, 'rb');
    
    // send the right headers
    header("Content-Type: image/png");
    header("Content-Length: " . filesize($name));

    // dump the picture and stop the script
    fpassthru($fp);
    exit;

} else if ($request_type == "MOSAIC_CARD") {
    require_once($cwd[__FILE__] . "/mosaics.php");

    $mosaic_id = $our_db->real_escape_string($_POST['mosaic_id']);
    $response['html'] = get_finished_mosaic_card($user_id, $mosaic_id, $filename);

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
    $mosaic_info = get_mosaic_info($user_id, $md5_hash);

    $response['html'] = "success!";
    $response['mosaic_info'] = $mosaic_info;

    echo json_encode($response);
} else if ($request_type == "DELETE_MOSAIC") {
    //this happens when the user deletes an uploading or untiled mosaic
    require_once($cwd[__FILE__] . "/mosaics.php");

    $md5_hash = $our_db->real_escape_string($_POST['md5_hash']);
    $mosaic_id = $our_db->real_escape_string($_POST['mosaic_id']);

    error_log("trying to delete a mosaic with md5_hash: '$md5_hash' and id: $mosaic_id");

    delete_mosaic($user_id, $mosaic_id);

    $response['html'] = 'success!';
    echo json_encode($response);

} else if ($request_type == "SHARE_MOSAICS") {
    require_once($cwd[__FILE__] . "/mosaics.php");

    $mosaic_ids = escape_array($_POST['mosaic_ids']);
    $mosaic_names = escape_array($_POST['mosaic_names']);
    $selected_emails = escape_array($_POST['selected_emails']);

    share_mosaics($user_id, $mosaic_ids, $mosaic_names, $selected_emails);

} else if ($request_type == "UNSHARE_MOSAICS") {
    require_once($cwd[__FILE__] . "/mosaics.php");

    $mosaic_ids = escape_array($_POST['mosaic_ids']);
    $mosaic_names = escape_array($_POST['mosaic_names']);
    $selected_emails = escape_array($_POST['selected_emails']);

    unshare_mosaics($user_id, $mosaic_ids, $mosaic_names, $selected_emails);

} else if ($request_type == "REMOVE_MOSAICS") {
    //this happens when the user selects one or more mosaics to remove
    require_once($cwd[__FILE__] . "/mosaics.php");

    $mosaic_ids = escape_array($_POST['mosaic_ids']);
    $mosaic_names = escape_array($_POST['mosaic_names']);

    remove_mosaics($user_id, $mosaic_ids, $mosaic_names);

} else if ($request_type == "CREATE_FOLDER") {
    require_once($cwd[__FILE__] . "/folders.php");

    $folder_name = $our_db->real_escape_string($_POST['folder_name']);

    create_folder($user_id, $folder_name);

} else if ($request_type == "MOVE_MOSAICS") {
    require_once($cwd[__FILE__] . "/folders.php");

    $folder_id = $our_db->real_escape_string($_POST['folder_id']);
    $mosaic_ids = escape_array($_POST['mosaic_ids']);
    $mosaic_names = escape_array($_POST['mosaic_names']);

    move_mosaics($user_id, $folder_id, $mosaic_ids, $mosaic_names);

} else if ($request_type == "REMOVE_FOLDER") {
    require_once($cwd[__FILE__] . "/folders.php");

    $folder_id = $our_db->real_escape_string($_POST['folder_id']);

    remove_folder($user_id, $folder_id);

} else if ($request_type == "CREATE_LABEL") {
    require_once($cwd[__FILE__] . "/labels.php");

    $mosaic_id = $our_db->real_escape_string($_POST['mosaic_id']);
    $label_name = $our_db->real_escape_string($_POST['label_name']);
    $label_color = $our_db->real_escape_string($_POST['label_color']);
    $label_type = $our_db->real_escape_string($_POST['label_type']);

    create_label($user_id, $mosaic_id, $label_name, $label_type, $label_color);

} else if ($request_type == "REMOVE_LABEL") {
    require_once($cwd[__FILE__] . "/labels.php");

    $mosaic_id = $our_db->real_escape_string($_POST['mosaic_id']);
    $label_id = $our_db->real_escape_string($_POST['label_id']);
    $label_name = $our_db->real_escape_string($_POST['label_name']);

    remove_label($user_id, $mosaic_id, $label_id, $label_name);
}
