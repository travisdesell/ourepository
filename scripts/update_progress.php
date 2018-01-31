<?php

$cwd[__FILE__] = __FILE__;
if (is_link($cwd[__FILE__])) $cwd[__FILE__] = readlink($cwd[__FILE__]);
$cwd[__FILE__] = dirname($cwd[__FILE__]);

require_once($cwd[__FILE__] . "/../db/my_query.php");

//echo "updating progress! " . $argv[1] . " of " . $argv[2] . " for mosaic: " . $argv[3] . "\n";

$current = floatval($argv[1]);
$max = floatval($argv[2]);

$mosaic_id = $argv[3];

$query = "UPDATE mosaics SET tiling_progress = " . 100.0 * ($current / ($max - 1.0)) . " WHERE id = $mosaic_id";
//echo $query . "\n";
fwrite(STDERR, $query . "\n");
query_our_db($query);

?>
