<?php

require_once "bootstrap.php";

$newUser = new User();
$newUser->setName("jim");
$newUser->setAdmin(true);

$entityManager->persist($newUser);
$entityManager->flush();

$newOrganization = new Organization();
$newOrganization = new Organization();
$newOrganization->setName("Org");
$newOrganization->setVisible(true);

$entityManager->persist($newOrganization);
$entityManager->flush();


$newMemberRole = new MemberRole();
$newMemberRole->setName("Pun");
$newMemberRole->setMember($newUser);
$newMemberRole->setOrganization($newOrganization);

// $newOrganization->setACL($newOrgACL);

$entityManager->persist($newMemberRole);
$entityManager->flush();


$newOrgACL = new OrgACL();
$newOrgACL->setPermission("edit_mosaic");
$newOrgACL->setMemberRole("AirtonomyTeam");
$newOrgACL->setOrganization("edit_mosaic");

// $entityManager->persist($newOrgACL);
// $entityManager->flush();




// $newMemberRole = new MemberRole();
// $newMemberRole->setMember($newUser);
// $newMemberRole->setOrganization($newOrganization);


// $entityManager->persist($newMemberRole);
// $entityManager->flush();