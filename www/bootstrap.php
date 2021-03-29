<?php

// bootstrap.php is the configuration for Doctrine ORM 

// Import this file to obtain the Entitymanager to start communicating with the Database Objects

// Look at api_v2.php to see how bootstrap is imported and used

// More information can be found here: https://www.doctrine-project.org/projects/doctrine-orm/en/2.8/reference/configuration.html





use Doctrine\ORM\Tools\Setup;
use Doctrine\ORM\EntityManager;

require_once "vendor/autoload.php";

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
    'user'     => 'jon',
    'password' => 'password',
    'dbname'   => 'our',
    'url' => 'mysql://jon:password@localhost:3306/our',

);


// obtaining the entity manager
$entityManager = EntityManager::create($dbParams, $config);