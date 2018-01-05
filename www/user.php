<?php

require_once 'vendor/autoload.php';

$cwd[__FILE__] = __FILE__;
if (is_link($cwd[__FILE__])) $cwd[__FILE__] = readlink($cwd[__FILE__]);
$cwd[__FILE__] = dirname($cwd[__FILE__]);

require_once($cwd[__FILE__] . "/../db/my_query.php");


function get_user_id($id_token) {
    global $our_db;

    //An ID token will be passed if there is a logged in user, otherwise display
    //the splash screen
    if ($id_token == NULL || $id_token == 'NONE') {
        echo "
    <div class='jumbotron'>
        <h1 class='display-3'>Welcome to the Open UAS Repository!</h1>
        <br>
        <p class='lead'>Please sign in with your Google account to get started.</p>

        <!-- <p>We use Google's authentication to ensure your data privacy and safety.</p> -->
    </div> <!-- jumbotron -->";

        exit();
    }

    //Validate the ID with google authentication to make sure we're not
    //getting scammed.
    $CLIENT_ID = "913778561877-7vmnbjvuc9c2g3c3qejgckjdtdivg9n1.apps.googleusercontent.com";
    //error_log("CLIENT ID: $CLIENT_ID");

    $client = new Google_Client(['client_id' => $CLIENT_ID]);

    $payload = $client->verifyIdToken($id_token);

    if (!$payload) {
        // Invalid ID token
        $response['err_title'] = "Login Authentication Failure";
        $response['err_msg'] = "Google Authentication failed, please reload page and log back in.";
        echo json_encode($response);
        exit(1);
    }

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
