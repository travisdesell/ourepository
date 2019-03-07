<?php

$cwd[__FILE__] = __FILE__;
if (is_link($cwd[__FILE__])) $cwd[__FILE__] = readlink($cwd[__FILE__]);
$cwd[__FILE__] = dirname($cwd[__FILE__]);

require_once($cwd[__FILE__] . "/../db/my_query.php");
//require_once($cwd[__FILE__] . "/../www/user.php");

require_once($cwd[__FILE__] . "/../www/settings.php");

function get_lat_lon($str, &$lat, &$lon) {
    $lat = substr($str, 41, 14);
    $lon = substr($str, 56, 14);

    echo "lat: '$lat', lon: '$lon'\n";
}

function get_utm($str, &$east, &$north) {
    $east = substr($str, 13, 12);
    $north = substr($str, 26, 12);

    echo "utm east: '$east', utm north: '$north'\n";
}


function generate_thumbnail($owner_id, $mosaic_id) {
    global $our_db, $UPLOAD_DIRECTORY, $ARCHIVE_DIRECTORY;

    //get filename from mosiac_id
    $query = "SELECT filename FROM mosaics WHERE owner_id = $owner_id AND id = $mosaic_id";
    $result = query_our_db($query);
    $row = $result->fetch_assoc();
    $filename = $row["filename"];

    //strip the file type
    $filename_base = substr($filename, 0, strrpos($filename, "."));
    echo "filename base: '$filename_base'\n";
    $thumbnail_filename = $filename_base . "_thumbnail.png";
    $preview_filename = $filename_base . "_preview.png";
    echo "thumbnail filename: '$thumbnail_filename'\n";

    //$command = "convert '$UPLOAD_DIRECTORY/$owner_id/$filename' -resize '350x350^' -gravity center -alpha off -crop 350x350+0+0 +repage '$ARCHIVE_DIRECTORY/$owner_id/$thumbnail_filename'";
    $command = "vipsthumbnail '$UPLOAD_DIRECTORY/$owner_id/$filename' --size 350x350 --crop -o '$ARCHIVE_DIRECTORY/$owner_id/$thumbnail_filename'";
    echo "command: '$command'\n";
    $output = shell_exec($command);

    //$command = "convert '$UPLOAD_DIRECTORY/$owner_id/$filename' -resize 1000 -alpha off '$ARCHIVE_DIRECTORY/$owner_id/$preview_filename'";
    $command = "vipsthumbnail '$UPLOAD_DIRECTORY/$owner_id/$filename' --size 1000 -o '$ARCHIVE_DIRECTORY/$owner_id/$preview_filename'";
    echo "command: '$command'\n";
    $output = shell_exec($command);

    echo $output . "\n";
}

function update_mosaic_metadata($owner_id, $mosaic_id) {
    global $our_db, $UPLOAD_DIRECTORY, $ARCHIVE_DIRECTORY;

    //get filename from mosiac_id
    $query = "SELECT filename FROM mosaics WHERE owner_id = $owner_id AND id = $mosaic_id";
    $result = query_our_db($query);
    $row = $result->fetch_assoc();
    $filename = $row["filename"];

    $command = "gdalinfo '$UPLOAD_DIRECTORY/$owner_id/$filename'";
    $output = shell_exec($command);

    echo $output . "\n";

    $lines = explode("\n", $output);

    $i = 0;
    foreach ($lines as $line) {
        echo "line $i : '$line'\n";
        $i++;
    }

    $size = preg_split("/[\s,]+/", $lines[2]);
    $width = $size[2];
    $height = $size[3];

    echo "height: $height, width: $width\n";

    $utm_zone = NULL;

    $metadata_start = 0;
    $coordinate_system = "";
    $coordinate_size = 0;
    for ($i = 4; $i < count($lines); $i++) {
        if ($lines[$i] == 'Metadata:') {
            $metadata_start = $i + 1;
            break;
        }

        if ($lines[$i] == 'Image Structure Metadata:') {
            //in this case there's no metadatat
            $metadata_start = $i;
            break;
        }

        if ($i != 4) $coordinate_system .= "\n";
        else {
            $pos = strpos($lines[$i], "UTM zone");

            if ($pos > 0) {
                $utm_zone = substr($lines[$i], $pos + 9, 3);
                echo "UTM zone: '$utm_zone'\n";
            }
        }
        $coordinate_system .= $lines[$i];
        $coordinate_size++;
    }

    echo "COORDINATE SYSTEM:\n$coordinate_system\n\n";

    $coordinates_start = 0;
    $bands_start = 0;
    $metadata = "";
    for ($i = $metadata_start; $i < count($lines); $i++) {
        if ($lines[$i] == 'Image Structure Metadata:') {
            $image_metadata_start = $i + 1;
            break;
        }
        
        if ($i != $metadata_start) $metadata .= "\n";
        $metadata .= $lines[$i];
    }

    $image_metadata = "";
    for ($i = $image_metadata_start; $i < count($lines); $i++) {
        if ($lines[$i] == 'Corner Coordinates:') {
            $coordinates_start = $i + 1;
            $bands_start = $i + 6;
            break;
        }
        
        if ($i != $image_metadata_start) $image_metadata .= "\n";
        $image_metadata .= $lines[$i];
    }


    echo "METADATA:\n$metadata\n\n";
    echo "IMAGE METADATA:\n$image_metadata\n\n";

    if ($coordinate_size > 1) {
        $upper_left_str = $lines[$coordinates_start];
        $lower_left_str = $lines[$coordinates_start + 1];
        $upper_right_str = $lines[$coordinates_start + 2];
        $lower_right_str = $lines[$coordinates_start + 3];
        $center_str = $lines[$coordinates_start + 4];

        echo "upper left str: '$upper_left_str'\n";
        get_lat_lon($upper_left_str, $lat_upper_left, $lon_upper_left);
        get_utm($upper_left_str, $utm_e_upper_left, $utm_n_upper_left);

        echo "upper right str: '$upper_right_str'\n";
        get_lat_lon($upper_right_str, $lat_upper_right, $lon_upper_right);
        get_utm($upper_right_str, $utm_e_upper_right, $utm_n_upper_right);

        echo "lower left str: '$lower_left_str'\n";
        get_lat_lon($lower_left_str, $lat_lower_left, $lon_lower_left);
        get_utm($lower_left_str, $utm_e_lower_left, $utm_n_lower_left);

        echo "lower right str: '$lower_right_str'\n";
        get_lat_lon($lower_right_str, $lat_lower_right, $lon_lower_right);
        get_utm($lower_right_str, $utm_e_lower_right, $utm_n_lower_right);

        echo "center str: '$center_str'\n";
        get_lat_lon($center_str, $lat_center, $lon_center);
        get_utm($center_str, $utm_e_center, $utm_n_center);
    }

    echo "\n";

    $channels = 0;

    $bands = "";
    for ($i = $bands_start; $i < count($lines); $i++) {
        if ($lines[$i] == '') break;

        if ($i != $bands_start) $bands .= "\n";
        $bands .= $lines[$i];
        if (strpos($lines[$i], 'Band') !== false) $channels++;
    }

    echo "BANDS:\n$bands\n\n";

    $coordinate_system = $our_db->real_escape_string($coordinate_system);
    $metadata = $our_db->real_escape_string($metadata);
    $bands = $our_db->real_escape_string($bands);

    if ($coordinate_size > 1) {
        $lat_upper_left = $our_db->real_escape_string($lat_upper_left);
        $lat_upper_right = $our_db->real_escape_string($lat_upper_right);
        $lat_lower_left = $our_db->real_escape_string($lat_lower_left);
        $lat_lower_right = $our_db->real_escape_string($lat_lower_right);
        $lat_center = $our_db->real_escape_string($lat_center);

        $lon_upper_left = $our_db->real_escape_string($lon_upper_left);
        $lon_upper_right = $our_db->real_escape_string($lon_upper_right);
        $lon_lower_left = $our_db->real_escape_string($lon_lower_left);
        $lon_lower_right = $our_db->real_escape_string($lon_lower_right);
        $lon_center = $our_db->real_escape_string($lon_center);

        $utm_e_upper_left = $our_db->real_escape_string($utm_e_upper_left);
        $utm_e_upper_right = $our_db->real_escape_string($utm_e_upper_right);
        $utm_e_lower_left = $our_db->real_escape_string($utm_e_lower_left);
        $utm_e_lower_right = $our_db->real_escape_string($utm_e_lower_right);
        $utm_e_center = $our_db->real_escape_string($utm_e_center);

        $utm_n_upper_left = $our_db->real_escape_string($utm_n_upper_left);
        $utm_n_upper_right = $our_db->real_escape_string($utm_n_upper_right);
        $utm_n_lower_left = $our_db->real_escape_string($utm_n_lower_left);
        $utm_n_lower_right = $our_db->real_escape_string($utm_n_lower_right);
        $utm_n_center = $our_db->real_escape_string($utm_n_center);
    }

    $query = "UPDATE mosaics SET coordinate_system = '$coordinate_system', metadata = '$metadata', image_metadata = '$image_metadata', bands = '$bands'"
        . ", width = '$width'"
        . ", height = '$height'"
        . ", channels = '$channels'";

    if ($utm_zone != NULL) {
        $query .= ", utm_zone = '$utm_zone'";
    }

    if ($coordinate_size > 1) {

        $query .= ", geotiff = true"
            . ", lat_upper_left = '$lat_upper_left'"
            . ", lat_upper_right = '$lat_upper_right'"
            . ", lat_lower_left = '$lat_lower_left'"
            . ", lat_lower_right = '$lat_lower_right'"
            . ", lat_center = '$lat_center'"
            . ", lon_upper_left = '$lon_upper_left'"
            . ", lon_upper_right = '$lon_upper_right'"
            . ", lon_lower_left = '$lon_lower_left'"
            . ", lon_lower_right = '$lon_lower_right'"
            . ", lon_center = '$lon_center'"

            . ", utm_e_upper_left = '$utm_e_upper_left'"
            . ", utm_e_upper_right = '$utm_e_upper_right'"
            . ", utm_e_lower_left = '$utm_e_lower_left'"
            . ", utm_e_lower_right = '$utm_e_lower_right'"
            . ", utm_e_center = '$utm_e_center'"
            . ", utm_n_upper_left = '$utm_n_upper_left'"
            . ", utm_n_upper_right = '$utm_n_upper_right'"
            . ", utm_n_lower_left = '$utm_n_lower_left'"
            . ", utm_n_lower_right = '$utm_n_lower_right'"
            . ", utm_n_center = '$utm_n_center'";
    } else {
        $query .= ", geotiff = false";
    }

    $query .= " WHERE id = $mosaic_id";


    echo "\n\n" . $query . "\n\n";
    query_our_db($query);
}

function split_mosaic($owner_id, $mosaic_id) {
    global $our_db, $UPLOAD_DIRECTORY, $ARCHIVE_DIRECTORY;

    //get filename from mosiac_id
    $query = "SELECT filename FROM mosaics WHERE owner_id = $owner_id AND id = $mosaic_id";
    $result = query_our_db($query);
    $row = $result->fetch_assoc();
    $filename = $row["filename"];

    echo "filename: '$filename'\n";
    $filename_base = substr($filename, 0, strrpos($filename, "."));
    echo "filename base: '$filename_base'\n";

    mkdir("$ARCHIVE_DIRECTORY/$owner_id", 0777, true);

    $query = "UPDATE mosaics SET status = 'TILING' WHERE id = $mosaic_id";
    error_log($query);
    query_our_db($query);

    $query = "UPDATE mosaics SET tiling_progress = 0 WHERE id = $mosaic_id";
    error_log($query);
    query_our_db($query);

    //$command = "../scripts/magick-slicer.sh -v3 -e png -mid $mosaic_id '$UPLOAD_DIRECTORY/$owner_id/$filename' '$ARCHIVE_DIRECTORY/$owner_id/$filename_base'";
    $command = "vips dzsave --suffix .png '$UPLOAD_DIRECTORY/$owner_id/$filename' '$ARCHIVE_DIRECTORY/$owner_id/$filename_base'";
    echo "command: '$command'\n";
    $output = shell_exec($command);

    $lines = explode("\n", $output);

    $output = $our_db->real_escape_string($output);

    $query = "UPDATE tiling_trace SET trace = '$output' WHERE mosaic_id = $mosaic_id";
    query_our_db($query);

    $i = 0;
    foreach ($lines as $line) {
        echo "line $i: '$line'\n";
        $i++;
    }

    //if (strpos($lines[count($lines) - 3], "complete") !== false) {
        $query = "UPDATE mosaics SET status = 'TILED' WHERE id = $mosaic_id";
        error_log($query);
        query_our_db($query);
        /*
    } else {
        $query = "UPDATE mosaics SET status = 'ERROR' WHERE id = $mosaic_id";
        error_log($query);
        query_our_db($query);
    }
         */
}


function process_uploaded_mosaic($owner_id, $mosaic_id) {
    generate_thumbnail($owner_id, $mosaic_id);
    update_mosaic_metadata($owner_id, $mosaic_id);
    split_mosaic($owner_id, $mosaic_id);
}

?>
