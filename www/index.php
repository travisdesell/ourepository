<?php


$cwd[__FILE__] = __FILE__;
if (is_link($cwd[__FILE__])) $cwd[__FILE__] = readlink($cwd[__FILE__]);
$cwd[__FILE__] = dirname($cwd[__FILE__]);

require_once($cwd[__FILE__] . "/header.php");
require_once($cwd[__FILE__] . "/navbar.php");
require_once($cwd[__FILE__] . "/Mustache.php/src/Mustache/Autoloader.php");
Mustache_Autoloader::register();

$additional_css = array();
$additional_css[] = "<style> #map { width: 100%; height: 100%; background-color: #434343; } </style>";
$additional_css[] = "<link rel='stylesheet' href='./css/index.css'>";

$additional_js = array();
//$additional_js[] = "<script type='text/javascript' src='./js/openseadragon.min.js'></script>";
//$additional_js[] = "<script type='text/javascript' src='./js/openseadragon-svg-overlay.js'></script>";
//$additional_js[] = "<script type='text/javascript' src='//d3js.org/d3.v3.min.js' charset='utf-8'></script>";
$additional_js[] = "<script type='text/javascript' src='./js/spark-md5.js'></script>";
$additional_js[] = "<script type='text/javascript'>var id_token='user';</script>"; //define an id_token variable for use by all other scripts
$additional_js[] = "<script type='text/javascript' src='./js/resumable2.js'></script>";
//$additional_js[] = "<script type='text/javascript' src='./js/mosaics.js'></script>";
$additional_js[] = "<script type='text/javascript' src='./js/index.js'></script>";

print_header($additional_css, $additional_js);

echo "<body>";

print_navbar();

echo "<div id='index-content'>";
echo file_get_contents($cwd[__FILE__] . "/templates/jumbotron_template.html");
echo "</div>";

echo "
<div id='success-modal' class='modal' tabindex='-1' role='dialog'>
  <div class='modal-dialog' role='document'>
    <div class='modal-content'>
      <div class='modal-header'>
        <h5 id='success-modal-title' class='modal-title'>Error</h5>
        <button type='button' class='close' data-dismiss='modal' aria-label='Close'>
          <span aria-hidden='true'>&times;</span>
        </button>
      </div>
      <div id='success-modal-body' class='modal-body'>
        <p>Modal body text goes here.</p>
      </div>
      <div class='modal-footer'>
        <button type='button' class='btn btn-secondary' data-dismiss='modal'>Close</button>
      </div>
    </div>
  </div>
</div>

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


?>
