<?php

$cwd[__FILE__] = __FILE__;
if (is_link($cwd[__FILE__])) $cwd[__FILE__] = readlink($cwd[__FILE__]);
$cwd[__FILE__] = dirname($cwd[__FILE__]);

require_once($cwd[__FILE__] . "/../db/my_query.php");
require_once($cwd[__FILE__] . "/process_mosaic.php");


while (true) {
    global $cwd;

    $query = "SELECT id, owner_id FROM mosaics WHERE status = 'UPLOADED'";
    echo "$query\n";
    $result = query_our_db($query);

    echo "query returned " . $result->num_rows . " mosaics needing to be tiled.\n";

    while (($row = $result->fetch_assoc()) != NULL) {
        $mosaic_id = $row['id'];
        $owner_id = $row['owner_id'];

        process_uploaded_mosaic($owner_id, $mosaic_id);
    }

    sleep(60);
}

?>
