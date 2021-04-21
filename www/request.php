<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Max-Age: 1000");
header("Access-Control-Allow-Headers: X-Requested-With, Content-Type, Origin, Cache-Control, Pragma, Authorization, Accept, Accept-Encoding");
header("Access-Control-Allow-Methods: PUT, POST, GET, OPTIONS, DELETE");

$cwd[__FILE__] = __FILE__;
if (is_link($cwd[__FILE__])) $cwd[__FILE__] = readlink($cwd[__FILE__]);
$cwd[__FILE__] = dirname($cwd[__FILE__]);

require_once($cwd[__FILE__] . "/../db/my_query.php");
require_once($cwd[__FILE__] . "/user.php");
require_once($cwd[__FILE__] . "/settings.php");
connect_our_db();

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


// Get $id_token via HTTPS POST.
if (isset($_POST['id_token'])) {
    $id_token = $_POST['id_token'];
    $request_type = $_POST['request'];
} else {
    $id_token = $_GET['id_token'];
    $request_type = $_GET['request'];
}

error_log("request is: $request_type");
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

} else if ($request_type == "MOSAIC_SOURCE") {

    $mosaic_id = $_GET['mosaic_id'];

    //check and see if user has access to this mosaic
    $query = "SELECT owner_id, filename FROM mosaics WHERE id = $mosaic_id";
    $result = query_our_db($query);
    $row = $result->fetch_assoc();
    $owner_id = $row['owner_id'];
    $filename = $row['filename'];

    if ($owner_id != $user_id) {
        $query = "SELECT user_id FROM mosaic_access WHERE mosaic_id = $mosaic_id AND user_id = $user_id";
        $result = query_our_db($query);
        $row = $result->fetch_assoc();
        if ($row == NULL) {
            exit;
        }
    }

    $name = "$UPLOAD_DIRECTORY/$owner_id/$filename";

    $extension = pathinfo($name, PATHINFO_EXTENSION);

    error_log("got a request for a mosaic source: '$name', extension: '$extension'");
    $fp = fopen($name, 'rb');
    if ( !$fp ) {
        error_log('fopen failed. reason: ', $php_errormsg);
    } else {
        error_log("success!");
        error_log("filesize:" . filesize($name));
    }

    
    // send the right headers
    header("Content-Type: image/png");
    header("Content-Length: " . filesize($name));

    // dump the picture and stop the script
    fpassthru($fp);
    exit;


} else if ($request_type == "TILE") {
    // open the file in a binary mode
    // tiles come as GETs not POSTs

    $name = $_GET['file'];
    $mosaic_id = $_GET['mosaic_id'];

    //check and see if user has access to this mosaic
    $query = "SELECT owner_id FROM mosaics WHERE id = $mosaic_id";
    $result = query_our_db($query);
    $row = $result->fetch_assoc();
    $owner_id = $row['owner_id'];
    if ($owner_id != $user_id) {
        $query = "SELECT user_id FROM mosaic_access WHERE mosaic_id = $mosaic_id AND user_id = $user_id";
        $result = query_our_db($query);
        $row = $result->fetch_assoc();
        if ($row == NULL) {
            exit;
        }
    }

    error_log("got a request for a tile: '$name'");
    $fp = fopen($name, 'rb');
    if ( !$fp ) {
        error_log('fopen failed. reason: ', $php_errormsg);
    } else {
        error_log("success!");
        error_log("filesize:" . filesize($name));
    }
    
    // send the right headers
    header("Content-Type: image/png");
    header("Content-Length: " . filesize($name));

    // dump the picture and stop the script
    fpassthru($fp);
    exit;

} else if ($request_type == "IMAGE") {
    // open the file in a binary mode
    // tiles come as GETs not POSTs

    $name = $_GET['file'];
    $mosaic_id = $_GET['mosaic_id'];

    //check and see if user has access to this mosaic
    $query = "SELECT owner_id FROM mosaics WHERE id = $mosaic_id";
    $result = query_our_db($query);
    $row = $result->fetch_assoc();
    $owner_id = $row['owner_id'];
    if ($owner_id != $user_id) {
        $query = "SELECT user_id FROM mosaic_access WHERE mosaic_id = $mosaic_id AND user_id = $user_id";
        $result = query_our_db($query);
        $row = $result->fetch_assoc();
        if ($row == NULL) {
            exit;
        }
    }

    $name = "$BASE_DIRECTORY$owner_id/$name";

    error_log("got a request for a tile: '$name'");
    $fp = fopen($name, 'rb');
    if ( !$fp ) {
        error_log('fopen failed. reason: ', $php_errormsg);
    } else {
        error_log("success!");
        error_log("filesize:" . filesize($name));
    }

    
    // send the right headers
    header("Content-Type: image/png");
    header("Content-Length: " . filesize($name));

    // dump the picture and stop the script
    fpassthru($fp);
    exit;

} else if ($request_type == "EXPORT_LABEL_CSV") {
    require_once($cwd[__FILE__] . "/export_labels.php");

    $label_id = $our_db->real_escape_string($_GET['label_id']);
    $mosaic_id = $our_db->real_escape_string($_GET['mosaic_id']);
    $export_type = $our_db->real_escape_string($_GET['export_type']);
    $coord_type = $our_db->real_escape_string($_GET['coord_type']);

    error_log("exporting label csv!");

    if ($export_type == "POLYGONS") {
        export_polygons($label_id, $mosaic_id, $coord_type);
    } else if ($export_type == "RECTANGLES") {
        export_rectangles($label_id, $mosaic_id, $coord_type);
    } else if ($export_type == "LINES") {
        export_lines($label_id, $mosaic_id, $coord_type);
    } else if ($export_type == "POINTS") {
        export_points($label_id, $mosaic_id, $coord_type);
    }

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

} else if ($request_type == "MODIFY_NAV_REQUEST") {
    require_once($cwd[__FILE__] . "/labels.php");

    $label_id = $our_db->real_escape_string($_POST['label_id']);

    label_nav_info($user_id, $label_id);

} else if ($request_type == "MODIFY_LABEL") {
    require_once($cwd[__FILE__] . "/labels.php");

    $label_id = $our_db->real_escape_string($_POST['label_id']);
    $label_name = $our_db->real_escape_string($_POST['label_name']);
    $label_type = $our_db->real_escape_string($_POST['label_type']);
    $label_color = $our_db->real_escape_string($_POST['label_color']);

    $share_with = $_POST['share_with'];
    $selected_mosaics = $_POST['selected_mosaics'];


    modify_label($user_id, $label_id, $label_name, $label_type, $label_color, $share_with, $selected_mosaics);

} else if ($request_type == "CREATE_LABEL") {
    require_once($cwd[__FILE__] . "/labels.php");

    $label_name = $our_db->real_escape_string($_POST['label_name']);
    $label_type = $our_db->real_escape_string($_POST['label_type']);
    $label_color = $our_db->real_escape_string($_POST['label_color']);

    $share_with = $_POST['share_with'];
    $selected_mosaics = $_POST['selected_mosaics'];


    create_label($user_id, $label_name, $label_type, $label_color, $share_with, $selected_mosaics);

} else if ($request_type == "REMOVE_LABEL") {
    require_once($cwd[__FILE__] . "/labels.php");

    $label_id = $our_db->real_escape_string($_POST['label_id']);

    remove_label($user_id, $label_id);

} else if ($request_type == "CREATE_POINTS") {
    require_once($cwd[__FILE__] . "/marks.php");

    //error_log(print_r($_POST['points'], true));

    $mosaic_id = $our_db->real_escape_string($_POST['mosaic_id']);
    $label_id = $our_db->real_escape_string($_POST['label_id']);
    //need to escape points in the create points function for each value    

    create_points($user_id, $mosaic_id, $label_id, $_POST['points']);

} else if ($request_type == "CREATE_LINES") {
    require_once($cwd[__FILE__] . "/marks.php");

    //error_log(print_r($_POST['points'], true));

    $mosaic_id = $our_db->real_escape_string($_POST['mosaic_id']);
    $label_id = $our_db->real_escape_string($_POST['label_id']);
    //need to escape lines in the create lines function for each value    

    create_lines($user_id, $mosaic_id, $label_id, $_POST['lines']);

} else if ($request_type == "CREATE_RECTANGLES") {
    require_once($cwd[__FILE__] . "/marks.php");

    //error_log(print_r($_POST['points'], true));

    $mosaic_id = $our_db->real_escape_string($_POST['mosaic_id']);
    $label_id = $our_db->real_escape_string($_POST['label_id']);
    //need to escape rectangles in the create rectangles function for each value    

    create_rectangles($user_id, $mosaic_id, $label_id, $_POST['rectangles']);


} else if ($request_type == "CREATE_POLYGONS") {
    require_once($cwd[__FILE__] . "/marks.php");

    //error_log(print_r($_POST['points'], true));

    $mosaic_id = $our_db->real_escape_string($_POST['mosaic_id']);
    $label_id = $our_db->real_escape_string($_POST['label_id']);
    $points_strs = $_POST['points_strs'];

    create_polygons($user_id, $mosaic_id, $label_id, $points_strs);

} else if ($request_type == "CREATE_POLYGON") {
    require_once($cwd[__FILE__] . "/marks.php");

    //error_log(print_r($_POST['points'], true));

    $mosaic_id = $our_db->real_escape_string($_POST['mosaic_id']);
    $label_id = $our_db->real_escape_string($_POST['label_id']);
    $points_str = $our_db->real_escape_string($_POST['points_str']);

    create_polygon($user_id, $mosaic_id, $label_id, $points_str);

} else if ($request_type == "REMOVE_POINT") {
    require_once($cwd[__FILE__] . "/marks.php");

    //error_log(print_r($_POST['points'], true));

    $mosaic_id = $our_db->real_escape_string($_POST['mosaic_id']);
    $label_id = $our_db->real_escape_string($_POST['label_id']);
    $point_id = $our_db->real_escape_string($_POST['point_id']);

    remove_point($user_id, $label_id, $mosaic_id, $point_id);

} else if ($request_type == "REMOVE_LINE") {
    require_once($cwd[__FILE__] . "/marks.php");

    //error_log(print_r($_POST['lines'], true));

    $mosaic_id = $our_db->real_escape_string($_POST['mosaic_id']);
    $label_id = $our_db->real_escape_string($_POST['label_id']);
    $line_id = $our_db->real_escape_string($_POST['line_id']);

    remove_line($user_id, $label_id, $mosaic_id, $line_id);

} else if ($request_type == "REMOVE_RECTANGLE") {
    require_once($cwd[__FILE__] . "/marks.php");

    //error_log(print_r($_POST['rectangles'], true));

    $mosaic_id = $our_db->real_escape_string($_POST['mosaic_id']);
    $label_id = $our_db->real_escape_string($_POST['label_id']);
    $rectangle_id = $our_db->real_escape_string($_POST['rectangle_id']);

    remove_rectangle($user_id, $label_id, $mosaic_id, $rectangle_id);


} else if ($request_type == "REMOVE_POLYGON") {
    require_once($cwd[__FILE__] . "/marks.php");

    //error_log(print_r($_POST['polygons'], true));

    $mosaic_id = $our_db->real_escape_string($_POST['mosaic_id']);
    $label_id = $our_db->real_escape_string($_POST['label_id']);
    $polygon_id = $our_db->real_escape_string($_POST['polygon_id']);

    remove_polygon($user_id, $label_id, $mosaic_id, $polygon_id);

} else if ($request_type == "SHAPEFILE_UPLOAD") {
    require_once ($cwd[__FILE__] . "/gis/parse_shapefile.php");

    $mosaic_id = $our_db->real_escape_string($_POST['mosaic_id']);
    $label_id = $our_db->real_escape_string($_POST['label_id']);
    $import_type = $our_db->real_escape_string($_POST['import_type']);

    //get the uploaded dbf and shp files
    $dbf_file = "";
    $shp_file = "";
    $shx_file = "";

    $count = count($_FILES['files']['name']);
    for ($i = 0; $i < $count; $i++) {
        $file = $_FILES['files'];

        error_log('name: ' . $file['name'][$i]);
        error_log('name: ' . $file['tmp_name'][$i]);
        //move_uploaded_file($file['tmp_name'], $target);
        error_log("size: " . filesize($file['tmp_name'][$i]));

        if (substr($file['name'][$i], -4) == ".dbf") $dbf_file = $file['tmp_name'][$i];
        if (substr($file['name'][$i], -4) == ".shp") $shp_file = $file['tmp_name'][$i];
        if (substr($file['name'][$i], -4) == ".shx") $shx_file = $file['tmp_name'][$i];
    }

    error_log("dbf file: $dbf_file");
    error_log("shp file: $shp_file");
    error_log("shx file: $shx_file");

    if ($dbf_file == "") {
        $response['err_title'] = "DBF File Not Uploaded";
        $response['err_msg'] = "A .dbf file is required to be uploaded so the shapefile can be parsed, and one was not uploaded.";
        return;
    }

    if ($shp_file == "") {
        $response['err_title'] = "DBF File Not Uploaded";
        $response['err_msg'] = "A .shp file is required to be uploaded so the shapefile can be parsed, and one was not uploaded.";
        return;
    }

    if ($shx_file == "") {
        $response['err_title'] = "DBF File Not Uploaded";
        $response['err_msg'] = "A .shx file is required to be uploaded so the shapefile can be parsed, and one was not uploaded.";
        return;
    }

    import_shapefile($user_id, $mosaic_id, $label_id, $dbf_file, $shp_file, $shx_file, $import_type);

} else if ($request_type == "GET_PREDICTIONS") {
    require_once($cwd[__FILE__] . "/predictions.php");


    $job_id = $our_db->real_escape_string($_POST['job_id']);
    $mosaic_id = $our_db->real_escape_string($_POST['mosaic_id']);
    $label_id = $our_db->real_escape_string($_POST['label_id']);

    get_predictions($user_id, $job_id, $mosaic_id, $label_id);
}

?>
