<?php
$cwd[__FILE__] = __FILE__;
if (is_link($cwd[__FILE__])) $cwd[__FILE__] = readlink($cwd[__FILE__]);
$cwd[__FILE__] = dirname($cwd[__FILE__]);

require_once($cwd[__FILE__] . "/my_query.php");

$drop_tables = false;

if ($drop_tables) {
	query_our_db("DROP TABLE users");
	query_our_db("DROP TABLE projects");
    query_our_db("DROP TABLE mosaics");
}
    query_our_db("DROP TABLE mosaics");
    query_our_db("DROP TABLE tiling_trace");
    query_our_db("DROP TABLE mosaic_progress");


$query = "CREATE TABLE `mosaics` (
	`id` INT(11) NOT NULL AUTO_INCREMENT,
	`owner_id` INT(11) NOT NULL,
	`filename` VARCHAR(256) NOT NULL,
    `identifier` VARCHAR(128) NOT NULL,
    `number_chunks` int(11) NOT NULL,
    `uploaded_chunks` int(11) NOT NULL,
    `chunk_status` VARCHAR(8096) NOT NULL,
    `md5_hash` VARCHAR(32) NOT NULL,
    `size_bytes` INT(11) NOT NULL,
    `bytes_uploaded` INT(11) DEFAULT 0,
    `tiling_progress` double default 0,
    `status` varchar(16),
	`height` INT(11),
	`width` INT(11),
    `channels` INT(11),
    `geotiff` tinyint(1) NOT NULL,
    `coordinate_system` BLOB,
    `metadata` BLOB,
    `bands` BLOB,
    `lat_upper_left` VARCHAR(16) DEFAULT NULL,
    `lon_upper_left` VARCHAR(16) DEFAULT NULL,
    `lat_upper_right` VARCHAR(16) DEFAULT NULL,
    `lon_upper_right` VARCHAR(16) DEFAULT NULL,
    `lat_lower_left` VARCHAR(16) DEFAULT NULL,
    `lon_lower_left` VARCHAR(16) DEFAULT NULL,
    `lat_lower_right` VARCHAR(16) DEFAULT NULL,
    `lon_lower_right` VARCHAR(16) DEFAULT NULL,
    `lat_center` VARCHAR(16) DEFAULT NULL,
    `lon_center` VARCHAR(16) DEFAULT NULL,
    `utm_e_upper_left` double DEFAULT NULL,
    `utm_n_upper_left` double DEFAULT NULL,
    `utm_e_upper_right` double DEFAULT NULL,
    `utm_n_upper_right` double DEFAULT NULL,
    `utm_e_lower_left` double DEFAULT NULL,
    `utm_n_lower_left` double DEFAULT NULL,
    `utm_e_lower_right` double DEFAULT NULL,
    `utm_n_lower_right` double DEFAULT NULL,
    `utm_e_center` double DEFAULT NULL,
    `utm_n_center` double DEFAULT NULL,

	PRIMARY KEY (`id`),
	UNIQUE KEY (`owner_id`, `filename`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1";

query_our_db($query);

$query = "CREATE TABLE `tiling_trace` (
	`mosaic_id` INT(11) NOT NULL,
    `trace` BLOB default NULL,

	PRIMARY KEY(`mosaic_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1";

query_our_db($query);

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


$query = "CREATE TABLE `mosaic_access` (
	`user_id` INT(11) NOT NULL, 
	`mosaic_id` INT(11) NOT NULL, 
    `type` VARCHAR(16) NOT NULL,

	PRIMARY KEY (`user_id`, `mosaic_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1";

query_our_db($query);



?>
