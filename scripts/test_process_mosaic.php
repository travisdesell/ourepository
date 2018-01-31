<?php

$cwd[__FILE__] = __FILE__;
if (is_link($cwd[__FILE__])) $cwd[__FILE__] = readlink($cwd[__FILE__]);
$cwd[__FILE__] = dirname($cwd[__FILE__]);

require_once($cwd[__FILE__] . "/../db/my_query.php");
require_once($cwd[__FILE__] . "/process_mosaic.php");

function process_uploaded_mosaic_test($owner_id, $mosaic_id) {
    generate_thumbnail($owner_id, $mosaic_id);
    update_mosaic_metadata($owner_id, $mosaic_id);
    split_mosaic($owner_id, $mosaic_id);
}

$owner_id = $argv[1];
$mosaic_id = $argv[2];

process_uploaded_mosaic_test($owner_id, $mosaic_id);

/*
$result = query_our_db("SELECT owner_id, id FROM mosaics WHERE status='TILED'");
while (($row = $result->fetch_assoc()) != NULL) {
    $mosaic_id = $row['id'];
    $owner_id = $row['owner_id'];

    process_uploaded_mosaic($owner_id, $mosaic_id);
}
 */
?>
