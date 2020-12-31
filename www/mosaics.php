<?php

$cwd[__FILE__] = __FILE__;
if (is_link($cwd[__FILE__])) $cwd[__FILE__] = readlink($cwd[__FILE__]);
$cwd[__FILE__] = dirname($cwd[__FILE__]);

require_once($cwd[__FILE__] . "/../db/my_query.php");
require_once($cwd[__FILE__] . "/upload.php"); //for rrmdir
require_once($cwd[__FILE__] . "/marks.php"); //for create_polygon_points
require_once($cwd[__FILE__] . "/settings.php"); //for mosaic directories
require_once($cwd[__FILE__] . "/Mustache.php/src/Mustache/Autoloader.php");
Mustache_Autoloader::register();

function ordinal_suffix($num) {
    $num = $num % 100; // protect against large numbers
    if ($num < 11 || $num > 13) {
        switch($num % 10){
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        }
    }
    return 'th';
}

function get_finished_mosaic_card($user_id, $mosaic_id, &$filename) {
    global $cwd, $id_token;

    //$mosaic_result = query_our_db("SELECT * FROM mosaics WHERE owner_id = $user_id AND id = $mosaic_id");
    $query = "SELECT * FROM mosaics WHERE id = $mosaic_id";
    error_log($query);
    $mosaic_result = query_our_db($query);

    $mosaic_row = $mosaic_result->fetch_assoc();

    if ($user_id == $mosaic_row['owner_id']) {
        //user owns this mosaic

        $query = "SELECT users.email, users.id, users.name FROM mosaic_access, users WHERE users.id = mosaic_access.user_id AND mosaic_access.mosaic_id = $mosaic_id";
        //error_log($query);
        $result = query_our_db($query);

        while (($row = $result->fetch_assoc()) != NULL) {
            $mosaic_row['sharing'] = true;

            $mosaic_row['shared_with'][] = array(
                "mosaic_id" => $mosaic_id,
                "user_id" => $row['id'],
                "name" => $row['name'],
                "email" => $row['email']
            );
        }

    } else {
        //this mosaic is shared to this user
        $mosaic_row['shared'] = true;
        $owner_id = $mosaic_row['owner_id'];

        $result = query_our_db("SELECT name, email FROM users WHERE id = $owner_id");
        $row = $result->fetch_assoc();
        $mosaic_row['shared_by']['name'] = $row['name'];
        $mosaic_row['shared_by']['email'] = $row['email'];

    }

    if ($mosaic_row == NULL) {
        error_log("ERROR! could not find mosaic for card");
        $response['err_title'] = "Mosaic Display Error";
        $response['err_msg'] = "Could not find an uploaded mosaic with id '$mosaic_id'. Please reload the page and try again.";
        echo json_encode($response);
        exit(1);
    }

    $mosaic_row['size_kb'] = number_format($mosaic_row['size_bytes'] / 1024, 0);

    if ($mosaic_row['geotiff'] == 0) {
        unset($mosaic_row['geotiff']);
    }

    $filename = $mosaic_row['filename'];
    $filename_base = substr($filename, 0, strrpos($filename, "."));            
    $thumbnail_filename = $filename_base . "_thumbnail.png";
    $mosaic_row['thumbnail'] = $thumbnail_filename;

    $preview_filename = $filename_base . "_preview.png";
    $mosaic_row['preview'] = $preview_filename;
    $mosaic_row['id_token'] = $id_token;

    $mosaic_card_template = file_get_contents($cwd[__FILE__] . "/templates/mosaic_card_template.html");
    $m = new Mustache_Engine;
    return $m->render($mosaic_card_template, $mosaic_row);
}

function display_index($user_id) {
    global $cwd;

    $shares = array();
    $projects['all_mosaics'] = array();

    $projects['folders'] = array();

    $mosaic_ids = array();
    //get the ids of all mosaics owned by or shared with the user
    $query = "SELECT id FROM mosaics WHERE owner_id = $user_id AND status = 'TILED' ORDER BY filename";
    $result = query_our_db($query);
    while (($row = $result->fetch_assoc()) != NULL) {
        $mosaic_ids[] = $row['id'];
    }

    $query = "SELECT mosaic_id FROM mosaic_access WHERE user_id = $user_id";
    $result = query_our_db($query);
    while (($row = $result->fetch_assoc()) != NULL) {
        $mosaic_ids[] = $row['mosaic_id'];
    }

    $query = "SELECT folder_id, name FROM folders WHERE owner_id = $user_id";
    error_log($query);
    $folder_result = query_our_db($query);


    function cmp($a, $b) {
        return strnatcmp($a['filename'], $b['filename']);
    }


    while (($folder_row = $folder_result->fetch_assoc()) != NULL) {
        $folder_id = $folder_row['folder_id'];
        $folder_name = $folder_row['name'];

        $finished_mosaics = array();
        $query = "SELECT mosaic_id FROM folder_assignments WHERE owner_id = $user_id AND folder_id = $folder_id";
        $assignment_result = query_our_db($query);

        while (($assignment_row = $assignment_result->fetch_assoc()) != NULL) {
            $mosaic_id = $assignment_row['mosaic_id'];
            $card['card'] = get_finished_mosaic_card($user_id, $mosaic_id, $filename);
            $card['filename'] = $filename;
            $finished_mosaics[] = $card;

            $mosaic_result = query_our_db("SELECT * FROM mosaics WHERE id = $mosaic_id");
            $mosaic_row = $mosaic_result->fetch_assoc();
            $projects['all_mosaics'][] = $mosaic_row;

            $mosaic_ids = array_diff($mosaic_ids, [$mosaic_id]); // remove this ID from the array of mosaic ids
        }
        usort($finished_mosaics, "cmp");

        $projects['folders'][] = array(
            "folder_id" => $folder_id,
            "folder_name" => $folder_name,
            "folder_sort" => $folder_name,
            "finished_mosaics" => $finished_mosaics
        );
    }

    $finished_mosaics = array();
    foreach ($mosaic_ids as $mosaic_id) {
        $mosaic_result = query_our_db("SELECT * FROM mosaics WHERE id = $mosaic_id");
        $mosaic_row = $mosaic_result->fetch_assoc();
        $mosaic_id = $mosaic_row['id'];

        $card['card'] = get_finished_mosaic_card($user_id, $mosaic_id, $filename);
        $card['filename'] = $filename;

        $finished_mosaics[] = $card;
        $projects['all_mosaics'][] = $mosaic_row;
    }
    usort($finished_mosaics, "cmp");

    $projects['folders'][] = array(
        "folder_id" => "-1",
        "folder_name" => "Unorganized Mosaics",
        "folder_sort" => "ZZZZZZZZZZZZZZZZZZ",
        "finished_mosaics" => $finished_mosaics
    );
    error_log("folders size: " . count($projects['folders']));

    $projects['uploading_mosaics'] = array();

    $mosaic_result = query_our_db("SELECT * FROM mosaics WHERE owner_id = $user_id AND status != 'TILED' ORDER BY filename");
    while (($mosaic_row = $mosaic_result->fetch_assoc()) != NULL) {
        $mosaic_row['percentage'] = number_format($mosaic_row['bytes_uploaded'] * 100 / $mosaic_row['size_bytes'], 2);
        $mosaic_row['bytes_uploaded'] = number_format($mosaic_row['bytes_uploaded'] / 1024, 0);
        $mosaic_row['size_bytes'] = number_format($mosaic_row['size_bytes'] / 1024, 0);

        if ($mosaic_row['status'] == "UPLOADING") {
            $mosaic_row['status_text'] = 'upload incomplete';
            $mosaic_row['uploading'] = true;
        } else if ($mosaic_row['status'] == "UPLOADED") {
            $queue_query = "SELECT count(id) FROM mosaics WHERE status = 'UPLOADED' AND id < " . $mosaic_row['id'];
            error_log($queue_query);
            $queue_result = query_our_db($queue_query);
            $queue_row = $queue_result->fetch_assoc();
            $queue_length = $queue_row['count(id)'] + 1;

            $queue_length .= ordinal_suffix($queue_length);


            $mosaic_row['status_text'] = "$queue_length in tiling queue";
            $mosaic_row['uploaded'] = true;
        } else if ($mosaic_row['status'] == "TILING") {
            $mosaic_row['status_text'] = 'tiling';
            $mosaic_row['tiling'] = true;
            $mosaic_row['percentage'] = number_format($mosaic_row['tiling_progress'], 2);
        }

        $projects['uploading_mosaics'][] = $mosaic_row;
        $projects['all_mosaics'][] = $mosaic_row;
    }

    $projects['users'] = array();

    $users_result = query_our_db("SELECT email FROM users");
    while (($users_row = $users_result->fetch_assoc()) != NULL) {
        $projects['users'][] = $users_row;
    }

    $projects_template = file_get_contents($cwd[__FILE__] . "/templates/mosaics_template.html");

    $m = new Mustache_Engine;
    $response['html'] = $m->render($projects_template, $projects);
    $response['mosaics'] = $projects['all_mosaics'];

    $navbar_template = file_get_contents($cwd[__FILE__] . "/templates/index_navbar.html");

    $navbar_info['points'] = array();

    $labels_result = query_our_db("SELECT labels.* FROM labels INNER JOIN label_access WHERE label_access.label_id = labels.label_id AND label_access.user_id = $user_id AND labels.label_type = 'POINT' ORDER BY labels.label_name");
    while (($labels_row = $labels_result->fetch_assoc()) != NULL) {
        if ($labels_row['access'] != "R") $labels_row['writeable'] = 1;

        $color_r = hexdec( substr($labels_row['label_color'], 1, 2) );
        $color_g = hexdec( substr($labels_row['label_color'], 3, 2) );
        $color_b = hexdec( substr($labels_row['label_color'], 5, 2) );

        error_log("color " . $labels_row['label_color'] . ", r: $color_r, g: $color_g, b: $color_b");

        $labels_row['color_r'] = $color_r;
        $labels_row['color_g'] = $color_g;
        $labels_row['color_b'] = $color_b;

        $navbar_info['points'][] = $labels_row;
    }

    $navbar_info['lines'] = array();

    $labels_result = query_our_db("SELECT labels.* FROM labels INNER JOIN label_access WHERE label_access.label_id = labels.label_id AND label_access.user_id = $user_id AND labels.label_type = 'LINE' ORDER BY labels.label_name");
    while (($labels_row = $labels_result->fetch_assoc()) != NULL) {
        if ($labels_row['access'] != "R") $labels_row['writeable'] = 1;

        $color_r = hexdec( substr($labels_row['label_color'], 1, 2) );
        $color_g = hexdec( substr($labels_row['label_color'], 3, 2) );
        $color_b = hexdec( substr($labels_row['label_color'], 5, 2) );

        error_log("color " . $labels_row['label_color'] . ", r: $color_r, g: $color_g, b: $color_b");

        $labels_row['color_r'] = $color_r;
        $labels_row['color_g'] = $color_g;
        $labels_row['color_b'] = $color_b;

        $navbar_info['lines'][] = $labels_row;
    }

    $navbar_info['rectangles'] = array();

    $labels_result = query_our_db("SELECT labels.* FROM labels INNER JOIN label_access WHERE label_access.label_id = labels.label_id AND label_access.user_id = $user_id AND labels.label_type = 'RECTANGLE' ORDER BY labels.label_name");
    while (($labels_row = $labels_result->fetch_assoc()) != NULL) {
        if ($labels_row['access'] != "R") $labels_row['writeable'] = 1;

        $color_r = hexdec( substr($labels_row['label_color'], 1, 2) );
        $color_g = hexdec( substr($labels_row['label_color'], 3, 2) );
        $color_b = hexdec( substr($labels_row['label_color'], 5, 2) );

        error_log("color " . $labels_row['label_color'] . ", r: $color_r, g: $color_g, b: $color_b");

        $labels_row['color_r'] = $color_r;
        $labels_row['color_g'] = $color_g;
        $labels_row['color_b'] = $color_b;

        $navbar_info['rectangles'][] = $labels_row;
    }


    $navbar_info['polygons'] = array();

    $labels_result = query_our_db("SELECT labels.* FROM labels INNER JOIN label_access WHERE label_access.label_id = labels.label_id AND label_access.user_id = $user_id AND labels.label_type = 'POLYGON' ORDER BY labels.label_name");
    while (($labels_row = $labels_result->fetch_assoc()) != NULL) {
        if ($labels_row['access'] != "R") $labels_row['writeable'] = 1;

        $color_r = hexdec( substr($labels_row['label_color'], 1, 2) );
        $color_g = hexdec( substr($labels_row['label_color'], 3, 2) );
        $color_b = hexdec( substr($labels_row['label_color'], 5, 2) );

        error_log("color " . $labels_row['label_color'] . ", r: $color_r, g: $color_g, b: $color_b");

        $labels_row['color_r'] = $color_r;
        $labels_row['color_g'] = $color_g;
        $labels_row['color_b'] = $color_b;

        $navbar_info['polygons'][] = $labels_row;
    }

    $navbar_info['users'] = array();

    $users_result = query_our_db("SELECT email FROM users");
    while (($users_row = $users_result->fetch_assoc()) != NULL) {
        $navbar_info['users'][] = $users_row;
    }

    $response['navbar'] = $m->render($navbar_template, $navbar_info);

    echo json_encode($response);
}

function display_mosaic($user_id, $mosaic_id) {
    global $cwd, $ARCHIVE_DIRECTORY;

    //check and see if the mosaic exists
    $mosaic_result = query_our_db("SELECT * FROM mosaics WHERE id = $mosaic_id");
    $mosaic_row = $mosaic_result->fetch_assoc();
    if ($mosaic_row == NULL) {
        print_unknown_mosaic($project_id, $project_name, $mosaic_id);
        return;
    }

    //check and see if the user has access to it

    $filename = $mosaic_row['filename']; 
    $width = $mosaic_row['width']; 
    $height = $mosaic_row['height'];
    $channels = $mosaic_row['channels'];

    error_log("utm zone: " . $mosaic_row['utm_zone']);
    if ($mosaic_row['utm_zone'] != NULL) {
        $mosaic['has_utm'] = true;
        $navbar['has_utm'] = true;
    }

    if ($channels > 3) $mosaic['has_nir'] = true;
    if ($channels > 3) $navbar['has_nir'] = true;

    $filename = substr($filename, 0, strrpos($filename, "."));
    $response['mosaic_url'] = "$ARCHIVE_DIRECTORY/" . $mosaic_row['owner_id'] . '/' . $filename . '_files/';
    $response['height'] = $height;
    $response['width'] = $width;
    $response['channels'] = $channels;

    $mosaic['no_project'] = true;
    $mosaic['mosaic_name'] = $filename;

    $mosaic['labels'] = array();
    $query = "SELECT labels.* FROM labels INNER JOIN label_mosaics ON labels.label_id = label_mosaics.label_id AND label_mosaics.mosaic_id = $mosaic_id INNER JOIN label_access ON labels.label_id = label_access.label_id AND label_access.user_id = $user_id";
    $result = query_our_db($query);
    while (($row = $result->fetch_assoc()) != NULL) {
        $mosaic['has_labels'] = true;
        $mosaic['labels'][] = $row;
    }

    $response['mosaic_info'] = $mosaic_row;

    $points = array();
    //$query = "SELECT * FROM points WHERE mosaic_id = $mosaic_id AND owner_id = $user_id";
    //$query = "SELECT points.* FROM points INNER JOIN label_mosaics ON points.label_id = label_mosaics.label_id AND label_mosaics.mosaic_id = $mosaic_id INNER JOIN label_access ON points.label_id = label_access.label_id AND label_access.user_id = $user_id";

    $query = "SELECT points.* FROM points INNER JOIN label_access ON points.label_id = label_access.label_id AND label_access.user_id = $user_id AND points.mosaic_id = $mosaic_id";
    error_log($query);
    $result = query_our_db($query);
    while (($row = $result->fetch_assoc()) != NULL) {
        $label_id = $row['label_id'];

        $label_query = "SELECT label_color FROM labels WHERE label_id = $label_id";
        $label_result = query_our_db($label_query);
        $label_row = $label_result->fetch_assoc();
        $label_color = $label_row['label_color'];

        $point = array(
            'label_id' => $label_id,
            'color' => $label_color,
            'point_id' => $row['point_id'],
            'cx' => $row['cx'],
            'cy' => $row['cy'],
            'radius' => $row['radius']
        );

        $point_template = file_get_contents($cwd[__FILE__] . "/templates/point_template.html");
        $m = new Mustache_Engine;
        $point['html'] = $m->render($point_template, $point);

        $points[] = $point;
    }
    error_log("points that should be displayed: " . count($points));

    $mosaic['points'] = $points;
    $response['marks']['points'] = $points;

    $lines = array();
    //lines looks to be a reserved mysql word so we need to ` escape it
    $query = "SELECT `lines`.* FROM `lines` INNER JOIN label_access ON `lines`.label_id = label_access.label_id AND label_access.user_id = $user_id AND `lines`.mosaic_id = $mosaic_id";
    error_log($query);
    $result = query_our_db($query);
    while (($row = $result->fetch_assoc()) != NULL) {
        $label_id = $row['label_id'];

        $label_query = "SELECT label_color FROM labels WHERE label_id = $label_id";
        $label_result = query_our_db($label_query);
        $label_row = $label_result->fetch_assoc();
        $label_color = $label_row['label_color'];

        $line = array(
            'label_id' => $label_id,
            'color' => $label_color,
            'line_id' => $row['line_id'],
            'x1' => $row['x1'],
            'x2' => $row['x2'],
            'y1' => $row['y1'],
            'y2' => $row['y2']
        );

        $line_template = file_get_contents($cwd[__FILE__] . "/templates/line_template.html");
        $m = new Mustache_Engine;
        $line['html'] = $m->render($line_template, $line);

        $lines[] = $line;
    }
    $mosaic['lines'] = $lines;
    $response['marks']['lines'] = $lines;

    $rectangles = array();
    //rectangles looks to be a reserved mysql word so we need to ` escape it
    $query = "SELECT rectangles.* FROM rectangles INNER JOIN label_access ON rectangles.label_id = label_access.label_id AND label_access.user_id = $user_id AND rectangles.mosaic_id = $mosaic_id";
    error_log($query);
    $result = query_our_db($query);
    while (($row = $result->fetch_assoc()) != NULL) {
        $label_id = $row['label_id'];

        $label_query = "SELECT label_color FROM labels WHERE label_id = $label_id";
        $label_result = query_our_db($label_query);
        $label_row = $label_result->fetch_assoc();
        $label_color = $label_row['label_color'];

        $rectangle = array(
            'label_id' => $label_id,
            'color' => $label_color,
            'rectangle_id' => $row['rectangle_id'],
            'x1' => $row['x1'],
            'x2' => $row['x2'],
            'y1' => $row['y1'],
            'y2' => $row['y2']
        );

        $rectangle_template = file_get_contents($cwd[__FILE__] . "/templates/rectangle_template.html");
        $m = new Mustache_Engine;
        $rectangle['html'] = $m->render($rectangle_template, $rectangle);

        $rectangles[] = $rectangle;
    }
    $mosaic['rectangles'] = $rectangles;
    $response['marks']['rectangles'] = $rectangles;


    $polygons = array();
    //polygons looks to be a reserved mysql word so we need to ` escape it
    $query = "SELECT polygons.* FROM polygons INNER JOIN label_access ON polygons.label_id = label_access.label_id AND label_access.user_id = $user_id AND polygons.mosaic_id = $mosaic_id";
    error_log($query);
    $result = query_our_db($query);
    while (($row = $result->fetch_assoc()) != NULL) {
        $label_id = $row['label_id'];

        $label_query = "SELECT label_color FROM labels WHERE label_id = $label_id";
        $label_result = query_our_db($label_query);
        $label_row = $label_result->fetch_assoc();
        $label_color = $label_row['label_color'];

        $polygon = array(
            'label_id' => $label_id,
            'color' => $label_color,
            'polygon_id' => $row['polygon_id'],
            'points_str' => $row['points_str'],
            'points' => create_polygon_points($row['points_str'])
        );

        $polygon_template = file_get_contents($cwd[__FILE__] . "/templates/polygon_template.html");
        $m = new Mustache_Engine;
        $polygon['html'] = $m->render($polygon_template, $polygon);

        $lines[] = $line;

        $polygons[] = $polygon;
    }
    $mosaic['polygons'] = $polygons;
    $response['marks']['polygons'] = $polygons;


    $mosaic_template = file_get_contents($cwd[__FILE__] . "/templates/mosaic_template.html");
    $m = new Mustache_Engine;
    $response['html'] = $m->render($mosaic_template, $mosaic);

    $navbar['prediction_jobs'] = array();
    $jobs_result = query_our_db("SELECT jobs.*, labels.label_type FROM jobs, labels WHERE owner_id = $user_id AND mosaic_id = $mosaic_id AND jobs.label_id = labels.label_id ORDER BY jobs.name");
    while (($jobs_row = $jobs_result->fetch_assoc()) != NULL) {
        $navbar['prediction_jobs'][] = $jobs_row;
    }

    if (count($navbar['prediction_jobs']) > 0) {
        $navbar['has_predictions'] = true;
    }

    $navbar['mosaic_name'] = $filename;
    $navbar_template = file_get_contents($cwd[__FILE__] . "/templates/mosaic_navbar.html");
    $m = new Mustache_Engine;
    $response['navbar'] = $m->render($navbar_template, $navbar);

    echo json_encode($response);
}

function share_mosaics($user_id, $mosaic_ids, $mosaic_names, $emails) {
    global $our_db, $cwd;

    $invalid_emails = [];
    $valid_emails = [];
    $valid_email_ids = [];

    foreach ($emails as $email) {
        error_log("selected email: " . $email);
        //check if user exists
        $query = "SELECT id FROM users WHERE email = '$email'";
        $result = query_our_db($query);
        $row = $result->fetch_assoc();

        if ($row == NULL) {
            $invalid_emails[] = $email;
        } else {
            $valid_emails[] = $email;
            $valid_email_ids[] = $row['id'];
        }
    }

    $invalid_mosaics = [];
    $unowned_mosaics = [];
    $valid_mosaics = [];
    $valid_mosaic_ids = [];

    for ($i = 0; $i < count($mosaic_ids); $i++) {
        $mosaic_id = $mosaic_ids[$i];
        error_log("mosaic id: " . $mosaic_id);

        //check if mosaic_exists
        $query = "SELECT owner_id FROM mosaics WHERE id = $mosaic_id";
        $result = query_our_db($query);
        $row = $result->fetch_assoc();

        if ($row == NULL) {
            //mosaic does not exist
            $invalid_mosaics[] = $mosaic_names[$i];
        } else {
            //check if user is owner of mosaic
            $owner_id = $row['owner_id'];

            if ($owner_id != $user_id) {
                $unowned_mosaics[] = $mosaic_names[$i];
            } else {
                $valid_mosaics[] = $mosaic_names[$i];
                $valid_mosaic_ids[] = $mosaic_ids[$i];
            }
        }
    }

    $shares = array();

    $message = "";
    if (count($valid_emails) > 0 && count($valid_mosaic_ids) > 0) {
        for ($j = 0; $j < count($valid_mosaic_ids); $j++) {
            $mosaic_id = $valid_mosaic_ids[$j];
            $mosaic_name = $valid_mosaics[$j];

            $message .= "<p>Shared '$mosaic_name' with:</p>";
            $message .= "<table class='table table-bordered table-striped table-condensed'><tbody>";
            for ($i = 0; $i < count($valid_emails); $i++) {
                $email = $valid_emails[$i];
                $id = $valid_email_ids[$i];

                $query = "SELECT name FROM users WHERE id = $id";
                $result = query_our_db($query);
                $row = $result->fetch_assoc();
                $user_name = $row['name'];

                $query = "REPLACE INTO mosaic_access SET owner_id = $user_id, user_id = $id, mosaic_id = $mosaic_id, type = 'rw'";
                query_our_db($query);

                error_log($query);

                $shares[] = array(
                    "owner_id" => $user_id,
                    "user_id" => $id,
                    "mosaic_id" => $mosaic_id,
                    "user_name" => $user_name,
                    "email" => $email
                );

                $message .= "<tr><td>" . $email. "</td></tr>";
            }
            $message .= "</tbody></table>";
        }
    }

    if (count($invalid_mosaics) > 0) {
        $message .= "<br>";
        $message .= "<p>Could not share the following mosaics as they were not in the database (this should never happen, contact the administrator):</p>";
        $message .= "<table class='table table-bordered table-striped table-condensed'><tbody>";
        foreach ($invalid_mosaics as $invalid_mosaic) {
            $message .= "<tr><td>" . $invalid_mosaic . "</td></tr>";
        }
        $message .= "</tbody></table>";
    }

    if (count($unowned_mosaics) > 0) {
        $message .= "<br>";

        $message .= "<p>Could not share the following mosaics as they were not owned by you:</p>";
        $message .= "<table class='table table-bordered table-striped table-condensed'><tbody>";
        foreach ($unowned_mosaics as $unowned_mosaic) {
            $message .= "<tr><td>" . $unowned_mosaic . "</td></tr>";
        }
        $message .= "</tbody></table>";
    }

    if (count($invalid_emails) > 0) {
        $message .= "<br>";

        $message .= "<p>Could not share the mosaics with the following users as they do not exist:</p>";
        $message .= "<table class='table table-bordered table-striped table-condensed'><tbody>";
        foreach ($invalid_emails as $invalid_email) {
            $message .= "<tr><td>" . $invalid_email . "</td></tr>";
        }
        $message .= "</tbody></table>";
    }

    $response['message'] = $message;
    $response['title'] = 'Share Mosaics Results';
    $response['shares'] = $shares;

    echo json_encode($response);
}

function unshare_mosaics($user_id, $mosaic_ids, $mosaic_names, $emails) {
    global $our_db, $cwd;

    $invalid_emails = [];
    $valid_emails = [];
    $valid_email_ids = [];

    foreach ($emails as $email) {
        error_log("selected email: " . $email);
        //check if user exists
        $query = "SELECT id FROM users WHERE email = '$email'";
        $result = query_our_db($query);
        $row = $result->fetch_assoc();

        if ($row == NULL) {
            $invalid_emails[] = $email;
        } else {
            $valid_emails[] = $email;
            $valid_email_ids[] = $row['id'];
        }
    }

    $invalid_mosaics = [];
    $unowned_mosaics = [];
    $valid_mosaics = [];
    $valid_mosaic_ids = [];

    for ($i = 0; $i < count($mosaic_ids); $i++) {
        $mosaic_id = $mosaic_ids[$i];
        error_log("mosaic id: " . $mosaic_id);

        //check if mosaic_exists
        $query = "SELECT owner_id FROM mosaics WHERE id = $mosaic_id";
        $result = query_our_db($query);
        $row = $result->fetch_assoc();

        if ($row == NULL) {
            //mosaic does not exist
            $invalid_mosaics[] = $mosaic_names[$i];
        } else {
            //check if user is owner of mosaic
            $owner_id = $row['owner_id'];

            if ($owner_id != $user_id) {
                $unowned_mosaics[] = $mosaic_names[$i];
            } else {
                $valid_mosaics[] = $mosaic_names[$i];
                $valid_mosaic_ids[] = $mosaic_ids[$i];
            }
        }
    }

    $unshares = array();

    $message = "";
    if (count($valid_emails) > 0 && count($valid_mosaic_ids) > 0) {
        for ($j = 0; $j < count($valid_mosaic_ids); $j++) {
            $mosaic_id = $valid_mosaic_ids[$j];
            $mosaic_name = $valid_mosaics[$j];

            $message .= "<p>Unshared '$mosaic_name' with:</p>";
            $message .= "<table class='table table-bordered table-striped table-condensed'><tbody>";
            for ($i = 0; $i < count($valid_emails); $i++) {
                $email = $valid_emails[$i];
                $id = $valid_email_ids[$i];

                $query = "DELETE FROM mosaic_access WHERE user_id = $id AND mosaic_id = $mosaic_id";
                query_our_db($query);

                error_log($query);

                $unshares[] = array(
                    "user_id" => $id,
                    "mosaic_id" => $mosaic_id
                );


                $message .= "<tr><td>" . $email. "</td></tr>";
            }
            $message .= "</tbody></table>";
        }
    }

    if (count($invalid_mosaics) > 0) {
        $message .= "<br>";
        $message .= "<p>Could not unshare the following mosaics as they were not in the database (this should never happen, contact the administrator):</p>";
        $message .= "<table class='table table-bordered table-striped table-condensed'><tbody>";
        foreach ($invalid_mosaics as $invalid_mosaic) {
            $message .= "<tr><td>" . $invalid_mosaic . "</td></tr>";
        }
        $message .= "</tbody></table>";
    }

    if (count($unowned_mosaics) > 0) {
        $message .= "<br>";

        $message .= "<p>Could not unshare the following mosaics as they were not owned by you:</p>";
        $message .= "<table class='table table-bordered table-striped table-condensed'><tbody>";
        foreach ($unowned_mosaics as $unowned_mosaic) {
            $message .= "<tr><td>" . $unowned_mosaic . "</td></tr>";
        }
        $message .= "</tbody></table>";
    }

    if (count($invalid_emails) > 0) {
        $message .= "<br>";

        $message .= "<p>Could not unshare the mosaics with the following users as they do not exist:</p>";
        $message .= "<table class='table table-bordered table-striped table-condensed'><tbody>";
        foreach ($invalid_emails as $invalid_email) {
            $message .= "<tr><td>" . $invalid_email . "</td></tr>";
        }
        $message .= "</tbody></table>";
    }

    $response['message'] = $message;
    $response['title'] = 'Unshare Mosaics Results';
    $response['unshares'] = $unshares;

    echo json_encode($response);
}

function delete_mosaic($user_id, $mosaic_id) {
    global $UPLOAD_DIRECTORY, $ARCHIVE_DIRECTORY;

    $query = "SELECT filename, identifier FROM mosaics WHERE owner_id = $user_id AND id = '$mosaic_id'";
    error_log($query);
    $result = query_our_db($query);
    $row = $result->fetch_assoc();

    $filename = $row['filename'];
    $identifier = $row['identifier'];
    $upload_dir = "$UPLOAD_DIRECTORY/$user_id/$identifier/";

    error_log("recursively deleting directory $upload_dir");
    rrmdir($upload_dir);
    error_log("unlinking file: '$UPLOAD_DIRECTORY/$user_id/$filename'");
    unlink("$UPLOAD_DIRECTORY/$user_id/$filename");

    $filename_base = substr($filename, 0, strrpos($filename, "."));
    $thumbnail_filename = $filename_base . "_thumbnail.png";

    $tile_dir = "$ARCHIVE_DIRECTORY/$user_id/$filename_base" . "_files";
    rrmdir($tile_dir);
    unlink("$ARCHIVE_DIRECTORY/$user_id/$filename_base" . ".dzi");
    unlink("$ARCHIVE_DIRECTORY/$user_id/$filename_base" . "_thumbnail.png");

    $query = "DELETE FROM mosaics WHERE owner_id = $user_id AND id = '$mosaic_id'";
    error_log($query);
    query_our_db($query);

    $query = "DELETE FROM mosaic_access WHERE mosaic_id = $mosaic_id";
    error_log($query);
    query_our_db($query);

    $query = "DELETE FROM folder_assignments WHERE mosaic_id = $mosaic_id";
    error_log($query);
    query_our_db($query);
}

function remove_mosaics($user_id, $mosaic_ids, $mosaic_names) {
    global $our_db, $cwd;

    $invalid_mosaics = [];
    $deleted_mosaics = []; //mosaics that were deleted (owned by the user)
    $removed_mosaics = []; //mosaics which had access removed (those not owned by user)
    $processed_ids = []; //mosaic ids for 

    for ($i = 0; $i < count($mosaic_ids); $i++) {
        $mosaic_id = $mosaic_ids[$i];
        error_log("mosaic id: " . $mosaic_id);

        //check if mosaic_exists
        $query = "SELECT owner_id FROM mosaics WHERE id = $mosaic_id";
        $result = query_our_db($query);
        $row = $result->fetch_assoc();

        if ($row == NULL) {
            //mosaic does not exist
            $invalid_mosaics[] = $mosaic_names[$i];
        } else {
            //check if user is owner of mosaic
            $processed_ids[] = $mosaic_ids[$i];

            $owner_id = $row['owner_id'];
            if ($owner_id != $user_id) {
                //user is owner, delete the mosaic
                $removed_mosaics[] = $mosaic_names[$i];

                $query = "DELETE FROM mosaic_access WHERE mosaic_id = " . $mosaic_ids[$i] . " AND user_id = " . $user_id;
                query_our_db($query);

            } else {
                //user is not owner, remove access
                $deleted_mosaics[] = $mosaic_names[$i];
                delete_mosaic($user_id, $mosaic_ids[$i]);
            }
        }
    }


    $message = "";
    if (count($deleted_mosaics) > 0) {
        $message .= "<p>Deleted the following mosaics:</p>";
        $message .= "<table class='table table-bordered table-striped table-condensed'><tbody>";

        for ($j = 0; $j < count($deleted_mosaics); $j++) {
            $message .= "<tr><td>" . $deleted_mosaics[$j] . "</td></tr>";
        }
        $message .= "</tbody></table>";
    }

    if (count($removed_mosaics) > 0) {
        if (count($message) > 0) $message .= "<br>";
        $message .= "<p>Removed your access to:</p>";
        $message .= "<table class='table table-bordered table-striped table-condensed'><tbody>";

        for ($j = 0; $j < count($removed_mosaics); $j++) {
            $message .= "<tr><td>" . $removed_mosaics[$j] . "</td></tr>";
        }
        $message .= "</tbody></table>";
    }

    if (count($invalid_mosaics) > 0) {
        if (count($message) > 0) $message .= "<br>";
        $message .= "<p>Could not remove or delete the following mosaics as they were not in the database (this should never happen, contact the administrator):</p>";
        $message .= "<table class='table table-bordered table-striped table-condensed'><tbody>";
        foreach ($invalid_mosaics as $invalid_mosaic) {
            $message .= "<tr><td>" . $invalid_mosaic . "</td></tr>";
        }
        $message .= "</tbody></table>";
    }

    $response['message'] = $message;
    $response['title'] = 'Remove Mosaics Results';
    $response['removes'] = $processed_ids;

    echo json_encode($response);
}

?>

