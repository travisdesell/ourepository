<?php

// bootstrap.php is the configuration for Doctrine ORM 

// Import this file to obtain the Entitymanager to start communicating with the Database Objects

// Look at api_v2.php to see how bootstrap is imported and used

// More information can be found here: https://www.doctrine-project.org/projects/doctrine-orm/en/2.8/reference/configuration.html





use Doctrine\ORM\Tools\Setup;
use Doctrine\ORM\EntityManager;

require_once "vendor/autoload.php";
require_once "../db/db_info.php";

global $our_db, $our_db_name, $our_db_user, $our_db_password, $our_db_host;

// Create a simple "default" Doctrine ORM configuration for Annotations

$isDevMode = true;
$proxyDir = null;
$cache = null;
$useSimpleAnnotationReader = false;
$config = Setup::createAnnotationMetadataConfiguration(array(__DIR__."/src"), $isDevMode, $proxyDir, $cache, $useSimpleAnnotationReader);


// database configuration parameters
// the connection configuration
$dbParams = array(
    'driver'   => 'pdo_mysql',
    'user'     => $our_db_user,
    'password' => $our_db_password,
    'dbname'   => $our_db_name,
    'url' => 'mysql://'.$our_db_user.':'.$our_db_password.'@'.$our_db_host.'/'.$our_db_name,

);


// obtaining the entity manager
$entityManager = EntityManager::create($dbParams, $config);