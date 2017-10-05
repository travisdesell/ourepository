<?php

$files = scandir("./extracted_lines");

foreach ($files as $file) {
    //echo "strlen($file): " . strlen($file) . "\n";

    if (strlen($file) <= 4) continue;
    //echo "substr($file, -4): " . substr($file, -4) . "\n";

    if (substr($file, -4) != ".tif") continue;

    $file_png = substr($file, 0, -4) . ".png";

    $command = "convert ./extracted_lines/$file ./extracted_lines/$file_png";
    echo "$command\n";
    shell_exec($command);
}

?>
