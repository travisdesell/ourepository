<?php

$cwd[__FILE__] = __FILE__;
if (is_link($cwd[__FILE__])) $cwd[__FILE__] = readlink($cwd[__FILE__]);
$cwd[__FILE__] = dirname($cwd[__FILE__]);

require_once($cwd[__FILE__] . "/header.php");
require_once($cwd[__FILE__] . "/navbar.php");
require_once($cwd[__FILE__] . "/../../Mustache.php/src/Mustache/Autoloader.php");
Mustache_Autoloader::register();

$additional_css = array();
$additional_css[] = "<style> #map { width: 100%; height: 100%; background-color: #434343; } </style>";

$additional_js = array();
$additional_js[] = "<script type='text/javascript' src='./js/mosaics.js'></script>";
$additional_js[] = "<script type='text/javascript' src='./js/index.js'></script>";
$additional_js[] = "<script type='text/javascript' src='./js/openseadragon.min.js'></script>";
$additional_js[] = "<script type='text/javascript' src='./js/openseadragon-svg-overlay.js'></script>";
$additional_js[] = "<script type='text/javascript' src='//d3js.org/d3.v3.min.js' charset='utf-8'></script>";
$additional_js[] = "<script type='text/javascript' src='./js/resumable.js'></script>";

print_header($additional_css, $additional_js);

echo "<body>";

print_navbar();

echo "<div id='index-content'></div>";

echo "
</body>
</html>
";


?>
