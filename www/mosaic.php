<?php

$cwd[__FILE__] = __FILE__;
if (is_link($cwd[__FILE__])) $cwd[__FILE__] = readlink($cwd[__FILE__]);
$cwd[__FILE__] = dirname($cwd[__FILE__]);

require_once($cwd[__FILE__] . "/header.php");
require_once($cwd[__FILE__] . "/navbar.php");
require_once($cwd[__FILE__] . "/../db/my_query.php");

require_once($cwd[__FILE__] . "/Mustache.php/src/Mustache/Autoloader.php");
Mustache_Autoloader::register();

$additional_css = array();
$additional_css[] = "<style> #map { width: 100%; height: 100%; background-color: #434343; } </style>";
$additional_css[] = "<link rel='stylesheet' href='./css/mosaic.css'>";

$mosaic_id = $_GET['mosaic_id'];

$additional_js = array();
$additional_js[] = "<script type='text/javascript'>var mosaic_id = $mosaic_id;</script>";
$additional_js[] = "<script type='text/javascript'>var id_token='user';</script>"; //define an id_token variable for use by all other scripts

$additional_js[] = "<script type='text/javascript' src='./js/amwg256.js'></script>";
$additional_js[] = "<script type='text/javascript' src='./js/openseadragon.min.js'></script>";
$additional_js[] = "<script type='text/javascript' src='./js/openseadragon-filtering.js'></script>";
$additional_js[] = "<script type='text/javascript' src='./js/openseadragon-svg-overlay.js'></script>";
$additional_js[] = "<script type='text/javascript' src='//d3js.org/d3.v3.min.js' charset='utf-8'></script>";
$additional_js[] = "<script type='text/javascript' src='./js/proj4.js'></script>";
$additional_js[] = "<script type='text/javascript' src='./js/mosaics.js'></script>";

$query = "SELECT filename FROM mosaics WHERE id = $mosaic_id";
error_log($query);
$mosaic_result = query_our_db($query);

$mosaic_row = $mosaic_result->fetch_assoc();

$mosaic_name = $mosaic_row['filename'];
$mosaic_name = substr($mosaic_name, 0, -4);

print_header($additional_css, $additional_js, $mosaic_name);

echo "<body>";

print_navbar();

echo "<div id='index-content' style='height:100%;'></div>";

echo "
<div id='error-modal' class='modal' tabindex='-1' role='dialog'>
  <div class='modal-dialog' role='document'>
    <div class='modal-content'>
      <div class='modal-header'>
        <h5 id='error-modal-title' class='modal-title'>Error</h5>
        <button type='button' class='close' data-dismiss='modal' aria-label='Close'>
          <span aria-hidden='true'>&times;</span>
        </button>
      </div>
      <div id='error-modal-body' class='modal-body'>
        <p>Modal body text goes here.</p>
      </div>
      <div class='modal-footer'>
        <button type='button' class='btn btn-secondary' data-dismiss='modal'>Close</button>
      </div>
    </div>
  </div>
</div>
";

echo "
</body>
</html>
";


/*
$mosaic_info .= "var points = [";

$points_file = fopen("./mosaics/points_" . $name . ".csv", "r");
if ($points_file) {
    $first = true;

    $line = fgets($points_file); //skip the first line

    while (($line = fgets($points_file)) !== false) {
        if ($first) {
            $first = false;
        } else {
            $mosaic_info .= ", ";
        }
        $mosaic_info .= "[" . substr($line, 0, -1) . "]";
    }
}
fclose($points_file);

$mosaic_info .= "];\n";

$mosaic_info .= "var lines = [";

$lines_file = fopen("./mosaics/lines_" . $name . ".csv", "r");
if ($lines_file) {
    $first = true;

    $line = fgets($lines_file); //skip the first line

    while (($line = fgets($lines_file)) !== false) {
        if ($first) {
            $first = false;
        } else {
            $mosaic_info .= ", ";
        }
        $mosaic_info .= "[" . substr($line, 0, -1) . "]";
    }
}
fclose($lines_file);

$mosaic_info .= "];";
 */
