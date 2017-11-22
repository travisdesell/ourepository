<?php
$cwd[__FILE__] = __FILE__;
if (is_link($cwd[__FILE__])) $cwd[__FILE__] = readlink($cwd[__FILE__]);
$cwd[__FILE__] = dirname($cwd[__FILE__]);

require_once($cwd[__FILE__] . "/my_query.php");

$drop_tables = true;

if ($drop_tables) {
	query_our_db("DROP TABLE users");
	query_our_db("DROP TABLE projects");
	query_our_db("DROP TABLE mosaics");
}

$query = "CREATE TABLE `users` (
	`id` INT(11) NOT NULL AUTO_INCREMENT,
	`email` VARCHAR(256) NOT NULL,
	`name` VARCHAR(128) NOT NULL,
	`given_name` VARCHAR(64) NOT NULL,
	`family_name` VARCHAR(64) NOT NULL,

	PRIMARY KEY(`id`),
	UNIQUE KEY(`email`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1";

query_our_db($query);

$query = "CREATE TABLE `projects` (
	`id` INT(11) NOT NULL AUTO_INCREMENT,
	`owner_id` INT(11) NOT NULL, 
    `name` VARCHAR(128) NOT NULL,

    PRIMARY KEY (`id`),
    UNIQUE KEY(`id`, `name`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1";

query_our_db($query);

$query = "CREATE TABLE `project_access` (
	`user_id` INT(11) NOT NULL, 
	`project_id` INT(11) NOT NULL, 
    `type` VARCHAR(16) NOT NULL,

	PRIMARY KEY (`user_id`, `project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1";

query_our_db($query);

$query = "CREATE TABLE `mosaics` (
	`id` INT(11) NOT NULL AUTO_INCREMENT,
	`owner_id` INT(11) NOT NULL,
	`filename` VARCHAR(256) NOT NULL,
    `identifier` VARCHAR(128) NOT NULL,
    `bytes_uploaded` INT(11) DEFAULT 0,
    `total_size` INT(11) DEFAULT 0,
    `status` varchar(16),
	`height` INT(11),
	`width` INT(11),

	PRIMARY KEY (`id`),
	UNIQUE KEY (`owner_id`, `filename`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1";

query_our_db($query);


$query = "CREATE TABLE `mosaic_access` (
	`user_id` INT(11) NOT NULL, 
	`mosaic_id` INT(11) NOT NULL, 
    `type` VARCHAR(16) NOT NULL,

	PRIMARY KEY (`user_id`, `mosaic_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1";

query_our_db($query);



?>
