<?php

$files = scandir("./extracted_lines");

foreach ($files as $file) {
    //echo "strlen($file): " . strlen($file) . "\n";

    if (strlen($file) <= 4) continue;
    //echo "substr($file, -4): " . substr($file, -4) . "\n";

    if (substr($file, -4) != ".tif") continue;

    //echo "substr($file, -7, 3): " . substr($file, -7, 3) . "\n";
    if (substr($file, -7, 3) == "_sm") continue;

    $file_sm = substr($file, 0, -4) . "_sm.tif";

    $command = "convert ./extracted_lines/$file -resize 20% ./extracted_lines/$file_sm";
    echo "$command\n";
    shell_exec($command);
    //echo "{ src: './extracted_lines/$file', w: 500, h: 500, title: '$file' },\n";
}

?>
