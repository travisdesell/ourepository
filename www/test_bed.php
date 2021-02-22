<?php

hheader("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Max-Age: 1000");
header("Access-Control-Allow-Headers: X-Requested-With, Content-Type, Origin, Cache-Control, Pragma, Authorization, Accept, Accept-Encoding");
header("Access-Control-Allow-Methods: PUT, POST, GET, OPTIONS, DELETE");
// $cwd[__FILE__] = __FILE__;
// if (is_link($cwd[__FILE__])) $cwd[__FILE__] = readlink($cwd[__FILE__]);
// $cwd[__FILE__] = dirname($cwd[__FILE__]);



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
    echo json_encode($_POST['name']);

} else {
    $id_token = $_GET['id_token'];
    $request_type = $_GET['request'];

}

if($request_type == "CREATE_USER"){
    $newUser = new User();
    $newUser->setName($_POST['name']);
    $newUser->setAdmin(false);
    $entityManager->persist($newUser);
    try{
        $entityManager->flush();
        echo "SUCCESSFULLY CREATED USER"

    }
    catch (Exception $e) {
        echo 'Caught exception: ',  $e->getMessage(), "\n";
    }



}

// if(!isset($id_token)){
//     return; 
// }


// $entityManager->persist($newOrgACL);
// $entityManager->flush();




// $newMemberRole = new MemberRole();
// $newMemberRole->setMember($newUser);
// $newMemberRole->setOrganization($newOrganization);


// $entityManager->persist($newMemberRole);
// $entityManager->flush();
?>
