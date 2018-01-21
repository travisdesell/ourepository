<?php

$cwd[__FILE__] = __FILE__;
if (is_link($cwd[__FILE__])) $cwd[__FILE__] = readlink($cwd[__FILE__]);
$cwd[__FILE__] = dirname($cwd[__FILE__]);

$navbar_html = file_get_contents($cwd[__FILE__] . "/templates/initial_navbar.html");

function print_navbar() {
    global $navbar_html;

    echo $navbar_html;
}

function get_navbar() {
    global $navbar_html;

    error_log("get navbar: " . $navbar_html);
    return $navbar_html;
}

?>
