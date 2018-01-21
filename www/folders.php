<?php

$cwd[__FILE__] = __FILE__;
if (is_link($cwd[__FILE__])) $cwd[__FILE__] = readlink($cwd[__FILE__]);
$cwd[__FILE__] = dirname($cwd[__FILE__]);

require_once($cwd[__FILE__] . "/../db/my_query.php");
require_once($cwd[__FILE__] . "/../../Mustache.php/src/Mustache/Autoloader.php");
Mustache_Autoloader::register();

function create_folder($user_id, $folder_name) {
    global $our_db, $cwd;

    $query = "SELECT folder_id FROM folders WHERE owner_id = $user_id AND name = '$folder_name'";
    $result = query_our_db($query);
    $row = $result->fetch_assoc();

    //check and see if the folder already exists
    if ($row != NULL) {
        $response['err_title'] = "Create Folder Error";
        $response['err_msg'] = "Could not create the folder '$folder_name' as it already exists.";
        echo json_encode($response);
        return;
    }

    $query = "INSERT INTO folders SET owner_id = $user_id, name = '$folder_name'";
    query_our_db($query);

    $folder_info['name'] = $folder_name;
    $folder_info['sort'] = $folder_name;
    $folder_info['id'] = $our_db->insert_id;

    $folder_template= file_get_contents($cwd[__FILE__] . "/templates/folder_template.html");
    $m = new Mustache_Engine;
    $response['folder_html'] = $m->render($folder_template, $folder_info);

    $response['folder_id'] = $folder_info['id'];
    $response['folder_sort'] = $folder_info['name'];
    $response['folder_name'] = $folder_info['name'];

    echo json_encode($response);
}

function move_mosaics($user_id, $folder_id, $mosaic_ids, $mosaic_names) {
    global $our_db, $cwd;

    $moves = array();

    if ($folder_id == -1) {
        foreach ($mosaic_ids as $mosaic_id) {
            //these mosaics are being moved into the unorganized folder
            $query = "DELETE FROM folder_assignments WHERE owner_id = $user_id AND mosaic_id = $mosaic_id";
            error_log($query);
            query_our_db($query);

            $move = array(
                "mosaic_id" => $mosaic_id,
                "target_folder_id" => $folder_id
            );

            $moves[] = $move;
        }

    } else {
        $query = "SELECT owner_id FROM folders WHERE folder_id = $folder_id";
        error_log($query);

        $result = query_our_db($query);
        $row = $result->fetch_assoc();

        //check and see if the folder exists
        if ($row == NULL) {
            $response['err_title'] = "Move Mosaics Error";
            $response['err_msg'] = "Could not move mosaics to the designated folder because it does not exist in the database. This should never happen, please contact the administrator.";
            echo json_encode($response);
            return;
        }

        //check and see if the user owns this folder
        $owner_id = $row['owner_id'];
        if ($owner_id != $user_id) {
            $response['err_title'] = "Move Mosaics Error";
            $response['err_msg'] = "Could not move mosaics to the designated folder you do not own that folder. This should never happen, please contact teh administrator.";
            echo json_encode($response);
            return;
        }

        foreach ($mosaic_ids as $mosaic_id) {
            $query = "REPLACE INTO folder_assignments SET owner_id = $user_id, folder_id = $folder_id, mosaic_id = $mosaic_id";
            query_our_db($query);

            $move = array(
                "mosaic_id" => $mosaic_id,
                "target_folder_id" => $folder_id
            );

            $moves[] = $move;
        }
    }

    $response['moves'] = $moves;
    echo json_encode($response);
}

function remove_folder($user_id, $folder_id) {
    global $our_db, $cwd;

    $query = "DELETE FROM folder_assignments WHERE owner_id = $user_id AND folder_id = $folder_id";
    error_log($query);
    query_our_db($query);

    $query = "DELETE FROM folders WHERE owner_id = $user_id AND folder_id = $folder_id";
    error_log($query);
    query_our_db($query);

    $response['removed_folder_id'] = $folder_id;
    echo json_encode($response);
}


?>

