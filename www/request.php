<?php

require_once 'vendor/autoload.php';

$cwd[__FILE__] = __FILE__;
if (is_link($cwd[__FILE__])) $cwd[__FILE__] = readlink($cwd[__FILE__]);
$cwd[__FILE__] = dirname($cwd[__FILE__]);

require_once($cwd[__FILE__] . "/../db/my_query.php");
require_once($cwd[__FILE__] . "/user.php");


// Get $id_token via HTTPS POST.
$id_token = $_POST['id_token'];
$request_type = $_POST['request'];

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
error_log("CLIENT ID: $CLIENT_ID");

$client = new Google_Client(['client_id' => $CLIENT_ID]);

$payload = $client->verifyIdToken($id_token);
if (!$payload) {
    // Invalid ID token
    echo "<div class='jumbotron'>
        <p class='lead'>Invalid ID Token. Please sign back in.</p>
        </div> <!-- jumbotron -->";
    exit();
}

//Get our user ID for this email, create a new user if this user
//has not logged in before.
$user_id = get_user_id($payload);

if ($request_type == NULL || $request_type == "INDEX") {
    require_once($cwd[__FILE__] . "/projects.php");
    display_projects($user_id);

} else if ($request_type == "ADDPROJECT") {
    require_once($cwd[__FILE__] . "/projects.php");

    $project_name = $our_db->real_escape_string($_POST['project_name']);
    add_project($user_id, $project_name);
    display_projects($user_id);

} else if ($request_type == "MOSAICS") {
    require_once($cwd[__FILE__] . "/mosaics.php");
    $project_id = $our_db->real_escape_string($_POST['project_id']);

    display_mosaics($user_id, $project_id);
} else if ($request_type == "MOSAIC") {
    require_once($cwd[__FILE__] . "/mosaic.php");
    $project_id = $our_db->real_escape_string($_POST['project_id']);
    $mosaic_id = $our_db->real_escape_string($_POST['mosaic_id']);

    error_log("project_id: $project_id, mosaic_id: $mosaic_id");

    display_mosaic($user_id, $project_id, $mosaic_id);
}

?>
