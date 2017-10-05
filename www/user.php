<?php

$cwd[__FILE__] = __FILE__;
if (is_link($cwd[__FILE__])) $cwd[__FILE__] = readlink($cwd[__FILE__]);
$cwd[__FILE__] = dirname($cwd[__FILE__]);

require_once($cwd[__FILE__] . "/../db/my_query.php");


function get_user_id($payload) {
    global $our_db;

    error_log("testing to see if user exists: " . $payload['email']);

    $user_result = query_our_db("SELECT id FROM users WHERE email = '" . $payload['email'] . "'");

    if (($user_row = $user_result->fetch_assoc()) != NULL) {
        return $user_row['id'];
    } else {
        query_our_db("INSERT INTO users SET email = '" . $payload['email'] . "', name = '" .$payload['name'] . "', given_name = '" . $payload['given_name'] . "', family_name = '" . $payload['family_name'] . "'");
        return $our_db->insert_id;
    }
}

?>
