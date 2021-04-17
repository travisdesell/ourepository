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
if (isset($_POST['request'])) {
    $request_type = $_POST['request'];

} else if(isset($_GET['request'])){

    $request_type = $_GET['request'];

}else{

    return;
}




if($request_type == "CREATE_USER"){
    //TODO: Check if User is already created

    $email = $_POST['email'];
    $username = $_POST['username'];
    $given_name = $_POST['given_name'];
    $family_name = $_POST['family_name'];

    
    $existingUser=$entityManager->getRepository('User')
                                ->findOneBy(array('email' => $email));



    if (isset($existingUser)){
        error_log(json_encode($existingUser->getEmail()));
        error_log("USER EXISTS");
        echo rsp_msg("user_exists","A user with this email already exists");
        return;
    }

    $newUser = new User();

    $password = $_POST['password'];
    $shake = $_POST['shake'];

    $newUser->setEmail($email);
    $newUser->setShake($shake);

    $newUser->setGivenName($given_name);
    $newUser->setFamilyName($family_name);

    $newUser->setEmail($email);
    $newUser->setShake($shake);
    $newUser->setDescription("");

    $hash = hash_pbkdf2("sha256", $password, $shake, 16, 20);

    $newUser->setHash($hash);
    $newUser->setAdmin(false);
    $entityManager->persist($newUser);

    try{
        $entityManager->flush();

        $existingUser=$entityManager->getRepository('User')
        ->findOneBy(array('email' => $email));
        error_log("USER EXISTS");

        $_SESSION["uid"]= $existingUser->getId();
        $_SESSION["id"]= session_id();
        echo rsp_msg("created_user",$_SESSION["id"]);

    }
    catch (Exception $e) {
        echo 'Caught exception: ',  $e->getMessage(), "\n";
    }

} else if($request_type == "LOGIN_USER"){
    $email = $_POST['email'];
    error_log(json_encode("email: " . $_POST['email']));

    $existingUser=$entityManager->getRepository('User')
                                ->findOneBy(array('email' => $email));

    $password = $_POST['password'];

    if (isset($existingUser)){
        error_log(json_encode("SESSION COUNT: " . $_SESSION["count"]));
        $shake = $existingUser->getShake();

        $checkHash = hash_pbkdf2("sha256", $password, $shake, 16, 20);

        if($checkHash == $existingUser->getHash()){
            error_log("USER EXISTS");
            $_SESSION["uid"]= $existingUser->getId();
            $_SESSION["id"]=session_id();
            echo rsp_msg("hash_matches",$_SESSION["id"]);
            return;
        }

    }else{

        echo json_encode(session_id());
        return;

    }
    
} else if($request_type == "GET_AUTH"){
    
    error_log(session_id()."SESSION".$_SESSION["id"]);

    if($_SESSION["id"] == session_id()){
        echo json_encode("true");
    }else{
        echo json_encode("false");

    }

}else if($request_type == "LOGOUT_USER"){
    
    if($_SESSION["id"] != session_id()){
        echo json_encode("USER NOT AUTHENTICATED");
    }
    session_unset();
    session_destroy();
    echo json_encode("true");


}else if($request_type == "CREATE_ORG"){
    
    if($_SESSION["id"] != session_id()){
        echo json_encode("USER NOT AUTHENTICATED");
        return;
    }

    $existingUser=$entityManager->getRepository('User')
    ->findOneBy(array('id' => $_SESSION['uid']));

    $visible = $_POST['visible'];
    $org_name = $_POST['name'];

    $adminRole = new Role();
    $adminRole->setName("admin");
    $entityManager->persist($adminRole);

    $defaultRole= new Role();
    $defaultRole->setName("default");
    $entityManager->persist($defaultRole);

    $newMemberRole = new MemberRole();
    $newMemberRole->setMember($existingUser);
    $newMemberRole->setRole($adminRole);
    $entityManager->persist($newMemberRole);

    $newOrgACL = new OrgACL();
    $newOrgACL->setPermission("all");
    $newOrgACL->setRole($adminRole);
    $entityManager->persist($newOrgACL);

    $newOrganization = new Organization();
    $newOrganization->addMemberRole($newMemberRole);
    $newOrganization->addOrgACL($newOrgACL);
    $newOrganization->addRole($adminRole);
    $newOrganization->addRole($defaultRole);
    $newOrganization->setName($org_name);
    $newOrganization->setVisible($visible);

    $newMemberRole->setOrganization($newOrganization);
    $adminRole->setOrganization($newOrganization);
    $defaultRole->setOrganization($newOrganization);
    $newOrgACL->setOrganization($newOrganization);

    $entityManager->persist($newOrganization);

    try{
        $entityManager->flush();

        echo rsp_msg("ORG_CREATED","org_created");

    }
    catch (Exception $e) {
        echo 'Caught exception: ',  $e->getMessage(), "\n";
    }

}else if($request_type == "GET_ORGS"){
    if($_SESSION["id"] != session_id()){
        echo json_encode("USER NOT AUTHENTICATED");
        return;
    }

    $uid = $_SESSION['uid'];

    try{
        $query = $entityManager->createQuery('SELECT o FROM Organization o JOIN o.memberRoles m WHERE m.member = '.$uid);
        $orgs = $query->getResult();
        if(!isset($orgs)){
            echo rsp_msg("ORGS_RECEIVED_FAILED","no orgs were returned in the query");
            return;
        }
    
        error_log($orgs[0]->getName());
    
        echo rsp_msg("ORGS_RECEIVED",$orgs);
    }

    catch (Exception $e){
        echo 'Caught exception: ',  $e->getMessage(), "\n";

    }



    
}else if($request_type == "GET_AUTH_ORG_BY_NAME"){
    if($_SESSION["id"] != session_id()){
        echo json_encode("USER NOT AUTHENTICATED");
        return;
    }

    $uid = $_SESSION['uid'];
    $name = $_GET['name'];

    try{

        $query = $entityManager->createQuery('SELECT o FROM Organization o JOIN o.memberRoles m WHERE m.member = '.$uid.' AND  o.name = \''.$name.'\'');
        $orgs = $query->getResult();
       if(!isset($orgs)){
        echo rsp_msg("ORGS_RECEIVED_FAILED","no orgs were returned in the query");
        return;
    }
        echo rsp_msg("ORGS_RECEIVED",$orgs[0]);
    }

    catch (Exception $e){
        echo 'Caught exception: ',  $e->getMessage(), "\n";

    }

}else if($request_type == "HAS_ORG_PERMISSION"){
    if($_SESSION["id"] != session_id()){
        echo json_encode("USER NOT AUTHENTICATED");
        return;
    }

    $uid = $_SESSION['uid'];
    $permission = $_GET['permission'];
    $organization = $_GET['organization'];


    try{

        $query = $entityManager->createQuery('SELECT o FROM OrgACL o JOIN o.organization g WITH g.name = :org JOIN g.memberRoles m WITH m.member = :uid AND m.role = o.role WHERE o.permission IN (:permissions)');
        $query->setParameter('org', $organization);
        $query->setParameter('uid', $uid);
        $query->setParameter('permissions', array('all',$permission));


        $acls = $query->getResult();
        if(!isset($acls)){
            echo rsp_msg("NO_ORG_PERMISSION","The user does not have the proper permissions");
            return;
        }
        echo rsp_msg("HAS_ORG_PERMISSION",$acls);
    }

    catch (Exception $e){
        echo 'Caught exception: ',  $e->getMessage(), "\n";

    }

    return;

}else if($request_type == "GET_ORG_ROLES"){
    if($_SESSION["id"] != session_id()){
        echo json_encode("USER NOT AUTHENTICATED");
        return;
    }

    $uid = $_SESSION['uid'];
    $organization = $_GET['organization'];


    try{

        $query = $entityManager->createQuery('SELECT r FROM Role r JOIN r.organization g WITH g.name = :org JOIN g.memberRoles m WITH m.member = :uid');
        $query->setParameter('org', $organization);
        $query->setParameter('uid', $uid);


        $roles = $query->getResult();
        if(!isset($roles)){
            echo rsp_msg("NO_ORG_ROLE","Failed to retrieves roles from organization");
            return;
        }
        echo rsp_msg("ORG_ROLES_RECEIVED",$roles);
    }
    catch (Exception $e){
        echo 'Caught exception: ',  $e->getMessage(), "\n";

    }

    return;
}else if($request_type == "GET_ROLE_PERMISSIONS"){
    if($_SESSION["id"] != session_id()){
        echo json_encode("USER NOT AUTHENTICATED");
        return;
    }

    $uid = $_SESSION['uid'];
    $roleId = $_GET['role_id'];


    try{

        $query = $entityManager->createQuery('SELECT a FROM OrgACL a JOIN a.role r WITH r.id = :role_id');
        $query->setParameter('role_id', $roleId);


        $roles = $query->getResult();
        if(!isset($roles)){
            echo rsp_msg("NO_ROLE_PERMISSIONS","Failed to retrieve permissions for this role");
            return;
        }
        echo rsp_msg("ROLE_PERMISSIONS_RECEIVED",$roles);
    }
    catch (Exception $e){
        echo 'Caught exception: ',  $e->getMessage(), "\n";

    }

    return;
}else if($request_type == "CHANGE_ROLE_PERMISSIONS"){
    if($_SESSION["id"] != session_id()){
        echo json_encode("USER NOT AUTHENTICATED");
        return;
    }

    $uid = $_SESSION['uid'];
    $roleId = $_POST['role_id'];
    $changes = $_POST['changes'];

    //The change object contains keys and values that represent permissions 
    //and a boolean representing whether to add(true) or remove(false) a permission
    //Model -
    // {Permissions: boolean  }
    // Ex -
    // {all: true}
    // {add_members: false}

    $changeObj = json_decode($changes);

    if(!isset($changes)){
        return;
    }

    try{
        


        $query = $entityManager->createQuery('SELECT o FROM Organization o JOIN o.memberRoles m WHERE m.member = '.$uid.' AND  m.role = \''.$roleId.'\'');
        $org = $query->getResult()[0];
        error_log(json_encode($org));
        $role=$entityManager->getRepository('Role')
                            ->findOneBy(array('id' => $roleId));

        foreach($changeObj as $key => $value) {

            error_log($key . " => " . $value);

            if($value){

                $newOrgACL = new OrgACL();

                $newOrgACL->setOrganization($org);

                $newOrgACL->setRole($role);

                $newOrgACL->setPermission($key);

                $entityManager->persist($newOrgACL);
                


            }else{

                $query = $entityManager->createQuery('SELECT a FROM OrgACL a JOIN a.role r WITH r.id = :role_id WHERE a.permission = :permission');
                $query->setParameter('permission', $key);
                $query->setParameter('role_id', $roleId);

                $res = $query->getResult()[0];

                $entityManager->remove($res);


            }
        
        }

        echo rsp_msg("ROLE_PERMISSIONS_CHANGED",$roles);


    }
    catch(Exception $e){
        error_log(json_encode($e));
    }

    $entityManager->flush();


    return;

}else if($request_type == "ADD_ROLE"){
    if($_SESSION["id"] != session_id()){
        echo json_encode("USER NOT AUTHENTICATED");
        return;
    }

    $uid = $_SESSION['uid'];
    $roleName = $_POST['role_name'];
    $changes = $_POST['changes'];

    //The change object contains keys and values that represent permissions 
    //and a boolean representing whether to add(true) or remove(false) a permission
    //Model -
    // {Permissions: boolean  }
    // Ex -
    // {all: true}
    // {add_members: false}

    $changeObj = json_decode($changes);

    if(!isset($changes)){
        return;
    }

    try{
        


        $query = $entityManager->createQuery('SELECT o FROM Organization o JOIN o.memberRoles m WHERE m.member = '.$uid);
        $org = $query->getResult()[0];
        error_log(json_encode($org));
        $role= new Role();
        $role->setName($roleName);
        $role->setOrganization($org);

        $entityManager->persist($role);

        foreach($changeObj as $key => $value) {

            error_log($key . " => " . $value);

            if($value){

                $newOrgACL = new OrgACL();

                $newOrgACL->setOrganization($org);

                $newOrgACL->setRole($role);

                $newOrgACL->setPermission($key);

                $entityManager->persist($newOrgACL);
                
            }
        
        }

        echo rsp_msg("ROLE_ADDED",$roles);


    }
    catch(Exception $e){
        error_log(json_encode($e));
    }

    $entityManager->flush();

    return;
}else if($request_type == "DELETE_ROLE"){
    if($_SESSION["id"] != session_id()){
        echo json_encode("USER NOT AUTHENTICATED");
        return;
    }

    $uid = $_SESSION['uid'];
    $roleId = $_POST['role_id'];

    try{
        


        $query = $entityManager->createQuery('SELECT o FROM Organization o JOIN o.memberRoles m WHERE m.member = '.$uid.' AND  m.role = \''.$roleId.'\'');
        $org = $query->getResult()[0];
        error_log(json_encode($org));
        $role=$entityManager->getRepository('Role')
                            ->findOneBy(array('id' => $roleId));
        if(!isset($role)){
            return;
        }

        $entityManager->remove($role);

        echo rsp_msg("ROLE_DELETED",$role);


    }
    catch(Exception $e){
        error_log(json_encode($e));
    }

    $entityManager->flush();


    return;

}



function rsp_msg($code,$message){
    return json_encode(["code" => $code , "message" => $message ]);
}

// function generateJWT($id){
//     global $secret_key;
//     $payload = array(
//         "id" -> $id
//     );

//     error_log(json_encode($secret_key));

//     $jwt = JWT::encode($payload, $secret_key);
//     return $jwt;
// }

?>
