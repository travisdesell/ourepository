<?php
session_start();

if(!isset($_SESSION["count"])){
    $_SESSION["count"] = 0;
}else{
    $_SESSION["count"] = $_SESSION["count"]+1;
}

use \Firebase\JWT\JWT;


$secret_key = "test_secret";

header("Access-Control-Allow-Origin: "."http://".getenv("REACT_DOMAIN").":".getenv("REACT_PORT"));
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Max-Age: 1000");
header("Access-Control-Allow-Headers: alg, X-Requested-With, Content-Type, Origin, Cache-Control, Pragma, Authorization, Accept, Accept-Encoding,xhrfields,crossdomain");
header("Access-Control-Allow-Methods: PUT, POST, GET, OPTIONS, DELETE");

require_once "bootstrap.php";

foreach ($_FILES as $file) {
    error_log("file: " . json_encode($file));
}

foreach ($_GET as $key => $value) {
    error_log("_GET['$key']: '$value'");
}

foreach ($_POST as $key => $value) {
    error_log("_POST['$key']: '$value'");
}

// Get $id_token via HTTPS POST.
if (isset($_POST['id_token'])) {
    $id_token = $_POST['id_token'];
    $request_type = $_POST['request'];

} else {
    error_log(json_encode("GOTTEN HERE"));

    $id_token = $_GET['id_token'];
    $request_type = $_GET['request'];

}

if($request_type == "CREATE_USER"){
    //TODO: Check if User is already created

    $email = $_POST['email'];

    
    $existingUser=$entityManager->getRepository('User')
                                ->findOneBy(array('email' => $email));




    if (isset($existingUser)){
        error_log(json_encode($existingUser->getEmail()));
        error_log("USER EXISTS");
        echo error_msg("user_exists","A user with this email already exists");
        return;
    }

    $newUser = new User();

    $password = $_POST['password'];
    $shake = $_POST['shake'];

    $newUser->setEmail($email);
    $newUser->setShake($shake);

    $hash = hash_pbkdf2("sha256", $password, $shake, 16, 20);

    $newUser->setHash($hash);
    $newUser->setAdmin(false);
    $entityManager->persist($newUser);
    try{
        $entityManager->flush();
        echo error_msg("created_user",generateJWT($newUser->getId()));

    }
    catch (Exception $e) {
        echo 'Caught exception: ',  $e->getMessage(), "\n";
    }

} else if($request_type == "LOGIN_USER"){
    $email = $_POST['email'];

    error_log(json_encode("SESSION COUNT: " . $_SESSION["count"]));

    $existingUser=$entityManager->getRepository('User')
                                ->findOneBy(array('email' => $email));

    $password = $_POST['password'];




    if (isset($existingUser)){
        error_log(json_encode($existingUser->getEmail()));
        $shake = $existingUser->getShake();

        $checkHash = hash_pbkdf2("sha256", $password, $shake, 16, 20);

        if($checkHash == $existingUser->getHash()){
            error_log("USER EXISTS");
            echo error_msg("hash_matches",generateJWT($existingUser->getId()));
            return;
        }
    }else{
        echo json_encode(session_id());
        return;
    }
} else if($request_type == "GET_AUTH"){
    $jwt = $_GET['jwt'];

    
    try{
        JWT::$leeway = 60; // $leeway in seconds
        $decoded = JWT::decode($jwt, $secret_key, array('HS256'));
    }
    catch (Exception $e) {
        echo 'Caught exception: ',  $e->getMessage(), "\n";
    }

    if(isset($decoded)){
        echo json_encode("true");
    }

}


function error_msg($code,$message){
    return json_encode(["code" => $code , "message" => $message ]);
}

function generateJWT($id){
    global $secret_key;
    $payload = array(
        "id" -> $id
    );

    error_log(json_encode($secret_key));

    $jwt = JWT::encode($payload, $secret_key);
    return $jwt;
}

?>
