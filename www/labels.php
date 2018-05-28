<?php

$cwd[__FILE__] = __FILE__;
if (is_link($cwd[__FILE__])) $cwd[__FILE__] = readlink($cwd[__FILE__]);
$cwd[__FILE__] = dirname($cwd[__FILE__]);

require_once($cwd[__FILE__] . "/../db/my_query.php");
require_once($cwd[__FILE__] . "/../../Mustache.php/src/Mustache/Autoloader.php");
Mustache_Autoloader::register();

function label_nav_info($user_id, $label_id) {
    $query = "SELECT user_id, access FROM label_access WHERE label_id = $label_id";
    $result = query_our_db($query);

    $is_owner = false;
    $has_rw = false;

    $shares = array();

    while (($row = $result->fetch_assoc()) != NULL) {
        if ($row['user_id'] == $user_id) {
            if ($row['access'] == "O") {
                $is_owner = true;
                $has_rw = true;
            } else {
                $has_rw = true;
            }
        } else {
            $email_query = "SELECT email FROM users WHERE id = '" . $row['user_id'] . "'";
            $email_result = query_our_db($email_query);
            $email_row = $email_result->fetch_assoc();

            $share['email'] = $email_row['email']; 
            $share['access'] = $row['access'];

            $shares[] = $share;
        }
    }

    if (!$is_owner && !$has_rw) {
        $response['err_title'] = "Modify Label Nagivation Error";
        $response['err_msg'] = "Could not provide label modification info because user does not own or have write access on this label.";
        echo json_encode($response);
        return;
    }

    $query = "SELECT mosaic_id FROM label_mosaics WHERE label_id = $label_id";
    $result = query_our_db($query);

    $selected_mosaics = array();
    while (($row = $result->fetch_assoc()) != NULL) {
        $selected_mosaics[] = $row['mosaic_id'];
    }

    $response['shares'] = $shares;
    $response['selected_mosaics'] = $selected_mosaics;
    $response['is_owner'] = true;
    $response['has_rw'] = true;

    echo json_encode($response);
}

function modify_label($user_id, $label_id, $label_name, $label_type, $label_color, $share_with, $selected_mosaics) {
    global $our_db, $cwd;

    error_log("label id: " . $label_id);
    error_log("label name: " . $label_name);
    error_log("label color: " . $label_color);

    error_log("sharing with: " . json_encode($share_with));
    error_log("selected mosaics: " . json_encode($selected_mosaics));

    //check to see if user actualy has ownership or RW access for this label
    $query = "SELECT access FROM label_access WHERE user_id = $user_id AND label_id = $label_id";
    $result = query_our_db($query);
    $row = $result->fetch_assoc();

    $access = $row['access'];
    error_log("user access: '$access'");

    if ($access != "RW" && $access != "O") {
        $response['err_title'] = "Modify Label Error";
        $response['err_msg'] = "Could modify label '$label_name' because you do not have appropriate access privileges.";
        echo json_encode($response);
        return;
    }

    //delete all the shares and then insert the new ones
    //don't delete the ownership access
    $query = "DELETE FROM label_access WHERE label_id = $label_id AND access != 'O'";
    query_our_db($query);

    foreach ($share_with as $share) {
        $email = $our_db->real_escape_string($share['email']);
        $access = $our_db->real_escape_string($share['access']);

        $query = "SELECT id FROM users WHERE email = '$email'";
        $result = query_our_db($query);
        $row = $result->fetch_assoc();

        if ($row == NULL) {
            //user doesn't exist
            //undo what we've added to the database
            $query = "DELETE FROM labels WHERE label_id = $label_id";
            query_our_db($query);

            $query = "DELETE FROM label_access WHERE label_id = $label_id";
            query_our_db($query);

            $response['err_title'] = "Create Label Error";
            $response['err_msg'] = "Could not add access for user with email '$email' as that user does not exist in the database.";
            echo json_encode($response);
            return;
        }
        $share_user_id = $row['id'];

        $query = "INSERT INTO label_access SET access = '$access', label_id = $label_id, user_id = $share_user_id";
        query_our_db($query);
    }

    //delete all label_mosaics that the user has access to
    $query = "SELECT mosaic_id FROM label_mosaics WHERE label_id = $label_id";
    $result = query_our_db($query);

    while (($row = $result->fetch_assoc()) != NULL) {
        $mosaic_id = $row['mosaic_id'];

        //check and see if the user has access to this mosaic
        $has_access = false;
        $access_query = "SELECT owner_id FROM mosaics WHERE id = $mosaic_id";
        $access_result = query_our_db($access_query);
        $access_row = $access_result->fetch_assoc();

        //error_log("user_id is $user_id, owner_id is " . $access_row['owner_id']);

        if ($access_row['owner_id'] == $user_id) {
            //error_log("had access because was owner on $mosaic_id");
            $has_access = true;

        } else {
            //error_log("was not owner of $mosaic_id");

            $access_query = "SELECT user_id FROM mosaic_access WHERE mosaic_id = $mosaic_id AND user_id = $user_id";
            $access_result = query_our_db($access_query);
            $access_row = $access_result->fetch_assoc();

            if ($access_row != NULL) {
                $has_access = true;
                //error_log("had mosaic access on $mosaic_id");
            } else {
                //error_log("did not have mosaic access on $mosaic_id");
            }

        }

        if (!$has_access) continue;

        $label_mosaic_query = "DELETE FROM label_mosaics WHERE label_id = $label_id AND mosaic_id = $mosaic_id";
        //error_log($label_mosaic_query);
        query_our_db($label_mosaic_query);
    }

    foreach ($selected_mosaics as $mosaic) {
        $mosaic_id = $our_db->real_escape_string($mosaic['id']);

        $query = "INSERT INTO label_mosaics SET label_id = $label_id, mosaic_id = $mosaic_id";
        query_our_db($query);
    }


    $query = "UPDATE labels SET label_name = '$label_name', label_color = '$label_color' WHERE label_id = $label_id";
    query_our_db($query);

    $response['label_id'] = $label_id;
    $response['label_name'] = $label_name;
    $response['label_type'] = $label_type;
    $response['label_color'] = $label_color;

    $response['color_r'] = hexdec( substr($label_color, 1, 2) );
    $response['color_g'] = hexdec( substr($label_color, 3, 2) );
    $response['color_b'] = hexdec( substr($label_color, 5, 2) );


    $response['success_title'] = 'Success';
    $response['success_msg'] = "Label '$label_name' was modified successfully!";

    echo json_encode($response);
}


function create_label($user_id, $label_name, $label_type, $label_color, $share_with, $selected_mosaics) {
    global $our_db, $cwd;

    error_log("sharing with: " . json_encode($share_with));
    error_log("selected mosaics: " . json_encode($selected_mosaics));

    $query = "INSERT INTO labels SET label_name = '$label_name', label_type = '$label_type', label_color = '$label_color'";
    query_our_db($query);

    $label_id = $our_db->insert_id;

    $query = "INSERT INTO label_access SET access = 'O', label_id = $label_id, user_id = $user_id";
    query_our_db($query);

    foreach ($share_with as $share) {
        $email = $our_db->real_escape_string($share['email']);
        $access = $our_db->real_escape_string($share['access']);

        $query = "SELECT id FROM users WHERE email = '$email'";
        $result = query_our_db($query);
        $row = $result->fetch_assoc();

        if ($row == NULL) {
            //user doesn't exist
            //undo what we've added to the database
            $query = "DELETE FROM labels WHERE label_id = $label_id";
            query_our_db($query);

            $query = "DELETE FROM label_access WHERE label_id = $label_id";
            query_our_db($query);

            $response['err_title'] = "Create Label Error";
            $response['err_msg'] = "Could not add access for user with email '$email' as that user does not exist in the database.";
            echo json_encode($response);
            return;
        }
        $user_id = $row['id'];

        $query = "INSERT INTO label_access SET access = '$access', label_id = $label_id, user_id = $user_id";
        query_our_db($query);
    }

    foreach ($selected_mosaics as $mosaic) {
        $mosaic_id = $our_db->real_escape_string($mosaic['id']);

        $query = "INSERT INTO label_mosaics SET label_id = $label_id, mosaic_id = $mosaic_id";
        query_our_db($query);
    }


    $response['label_id'] = $label_id;
    $response['label_name'] = $label_name;
    $response['label_type'] = $label_type;
    $response['label_color'] = $label_color;

    $response['color_r'] = hexdec( substr($label_color, 1, 2) );
    $response['color_g'] = hexdec( substr($label_color, 3, 2) );
    $response['color_b'] = hexdec( substr($label_color, 5, 2) );

    $response['success_title'] = 'Success';
    $response['success_msg'] = "Label '$label_name' was created successfully!";

    echo json_encode($response);
}

function remove_label($user_id, $label_id) {
    global $our_db, $cwd;

    $query = "SELECT label_name FROM labels WHERE label_id = $label_id";
    $result = query_our_db($query);
    $row = $result->fetch_assoc();
    $label_name = $row['label_name'];

    $query = "DELETE FROM label_access WHERE user_id = $user_id AND label_id = $label_id";
    query_our_db($query);

    $response['label_id'] = $label_id;
    $response['success_title'] = "Removed Label Access";
    $response['success_msg'] = "<p>Successfully removed your access to label <b>$label_name</b></p>";

    echo json_encode($response);
}

function display_manage_labels($user_id) {
    global $cwd;

    $query = "SELECT * FROM labels WHERE owner_id = $user_id";
    error_log($query);
    $result = query_our_db($query);

    $manage_labels = array();
    while (($row = $result->fetch_assoc()) != NULL) {
        $manage_labels['labels'][] = $row;
        //error_log( print_r($row, true) );
    }

    $query = "SELECT * FROM folders WHERE owner_id = $user_id";
    error_log($query);
    $result = query_our_db($query);

    while (($row = $result->fetch_assoc()) != NULL) {
        $row['folder_name'] = $row['name'];

        $assignments_query = "SELECT mosaic_id FROM folder_assignments WHERE folder_id = ". $row['folder_id'] . " AND owner_id = $user_id";
        error_log($assignments_query);
        $assignments_result = query_our_db($assignments_query);

        while (($assignments_row = $assignments_result->fetch_assoc()) != NULL) {
            $mosaic_query = "SELECT id, owner_id, filename, size_bytes, channels FROM mosaics WHERE id = " . $assignments_row['mosaic_id'];
            error_log($mosaic_query);
            $mosaic_result = query_our_db($mosaic_query);

            $mosaic_row = $mosaic_result->fetch_assoc();
            $row['mosaics'][] = $mosaic_row;
        }


        $manage_labels['folders'][] = $row;
        //error_log( print_r($row, true) );
    }



    $manage_labels_template = file_get_contents($cwd[__FILE__] . "/templates/manage_labels_template.html");

    $m = new Mustache_Engine;
    $response['html'] = $m->render($manage_labels_template, $manage_labels);

    $response['navbar'] = file_get_contents($cwd[__FILE__] . "/templates/index_navbar.html");

    echo json_encode($response);
}

?>

