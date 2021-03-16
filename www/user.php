<?php

require_once 'vendor/autoload.php';

$cwd[__FILE__] = __FILE__;
if (is_link($cwd[__FILE__])) $cwd[__FILE__] = readlink($cwd[__FILE__]);
$cwd[__FILE__] = dirname($cwd[__FILE__]);

require_once($cwd[__FILE__] . "/../db/my_query.php");
require_once($cwd[__FILE__] . "/settings.php");


function get_user_id($id_token) {
    // global $our_db, $cwd, $CLIENT_ID;

    // //An ID token will be passed if there is a logged in user, otherwise display
    // //the splash screen
    // if ($id_token == NULL || $id_token == 'NONE') {
    //     $response['html'] = file_get_contents($cwd[__file__] . "/templates/jumbotron_template.html");

    //     echo json_encode($response);
    //     exit();
    // }
    // //error_log("CLIENT ID: $CLIENT_ID");

    // $client = new Google_Client(['client_id' => $CLIENT_ID]);

    // $payload = $client->verifyIdToken($id_token);

    // if (!$payload) {
    //     // Invalid ID token
    //     $response['err_title'] = "Login Authentication Failure";
    //     $response['err_msg'] = "Google Authentication failed, please reload page and log back in.";
    //     echo json_encode($response);
    //     exit(1);
    // }

    // //error_log("testing to see if user exists: " . $payload['email']);

    // $user_result = query_our_db("SELECT id FROM users WHERE email = '" . $payload['email'] . "'");

    // if (($user_row = $user_result->fetch_assoc()) != NULL) {
    //     return $user_row['id'];
    // } else {
    //     query_our_db("INSERT INTO users SET email = '" . $payload['email'] . "', name = '" .$payload['name'] . "', given_name = '" . $payload['given_name'] . "', family_name = '" . $payload['family_name'] . "'");
    //     return $our_db->insert_id;
    // }
    return 1;
}

?>
