<?php
$cwd[__FILE__] = __FILE__;
if (is_link($cwd[__FILE__])) $cwd[__FILE__] = readlink($cwd[__FILE__]);
$cwd[__FILE__] = dirname($cwd[__FILE__]);

require_once($cwd[__FILE__] . "/db_info.php");

$our_db = NULL;

function db_connect($server, $user, $passwd, $db) {
    $dbcnx = new mysqli($server, $user, $passwd, $db);

    if ($dbcnx->connect_errno) {
        //echo "Failed to connect to MySQL: (" . $dbcnx->connect_errno . ") " . $dbcnx->connect_error;
        error_log("Failed to connect to MySQL: (" . $dbcnx->connect_errno . ") " . $dbcnx->connect_error);
    }   

    return $dbcnx;
}

function connect_our_db() {
    global $our_db, $our_db_name, $our_db_user, $our_db_password, $our_db_host;

    // don't reconnect
    if (isset($our_db)) return;

    $our_db = db_connect($our_db_host, $our_db_user, $our_db_password, $our_db_name);
}

function mysqli_error_msg($db, $query) {
    error_log("MYSQL Error (" . $db->errno . "): " . $db->error . ", query: $query");
    //die("MYSQL Error (" . $db->errno . "): " . $db->error . ", query: $query");
}

function query_our_db($query) {
    global $our_db;

    if (!$our_db or !$our_db->ping()) connect_our_db();

    $result = $our_db->query($query);

    if (!$result) mysqli_error_msg($our_db, $query);

    return $result;
}

?>
