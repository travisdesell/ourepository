<?php

$cwd[__FILE__] = __FILE__;
if (is_link($cwd[__FILE__])) $cwd[__FILE__] = readlink($cwd[__FILE__]);
$cwd[__FILE__] = dirname($cwd[__FILE__]);

require_once($cwd[__FILE__] . "/../db/my_query.php");
require_once($cwd[__FILE__] . "/../../Mustache.php/src/Mustache/Autoloader.php");
Mustache_Autoloader::register();

function create_label($user_id, $mosaic_id, $label_name, $label_type, $label_color) {
    global $our_db, $cwd;

    $query = "SELECT label_id FROM labels WHERE owner_id = $user_id AND mosaic_id = $mosaic_id AND label_name = '$label_name'";
    error_log($query);
    $result = query_our_db($query);
    $row = $result->fetch_assoc();

    //check and see if the label already exists
    if ($row != NULL) {
        $response['err_title'] = "Create Label Error";
        $response['err_msg'] = "Could not create the folder '$label_name' as it already exists for this mosaic.";
        echo json_encode($response);
        return;
    }

    $query = "INSERT INTO labels SET owner_id = $user_id, mosaic_id = $mosaic_id, label_name = '$label_name', label_type = '$label_type', label_color = '$label_color'";
    query_our_db($query);

    $label_id = $our_db->insert_id;


    $response['label_id'] = $label_id;
    $response['label_name'] = $label_name;
    $response['label_type'] = $label_type;
    $response['label_color'] = $label_color;

    echo json_encode($response);
}

function remove_label($user_id, $mosaic_id, $label_id, $label_name) {
    global $our_db, $cwd;

    //check and see if the label already exists
    $query = "SELECT label_id FROM labels WHERE owner_id = $user_id AND mosaic_id = $mosaic_id AND label_id = $label_id";
    error_log($query);
    $result = query_our_db($query);
    $row = $result->fetch_assoc();

    if ($row == NULL) {
        $response['err_title'] = "Remove Label Error";
        $response['err_msg'] = "Could not remove the label '$label_name' as it does not exist in the database.";
        echo json_encode($response);
        return;
    }

    $query = "DELETE FROM labels WHERE owner_id = $user_id AND mosaic_id = $mosaic_id AND label_id = $label_id";
    error_log($query);
    $result = query_our_db($query);

    $response['label_id'] = $label_id;
    $response['label_name'] = $label_name;

    echo json_encode($response);
}

?>

