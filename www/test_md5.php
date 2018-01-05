<?php

echo ini_get("upload_max_filesize");
echo md5_file($argv[1]);

?>
