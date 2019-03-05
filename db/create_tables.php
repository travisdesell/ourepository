<?php
$cwd[__FILE__] = __FILE__;
if (is_link($cwd[__FILE__])) $cwd[__FILE__] = readlink($cwd[__FILE__]);
$cwd[__FILE__] = dirname($cwd[__FILE__]);

require_once($cwd[__FILE__] . "/my_query.php");

$drop_tables = false;

query_our_db("DROP TABLE mosaics");

if ($drop_tables) {
	query_our_db("DROP TABLE users");
	query_our_db("DROP TABLE projects");
    query_our_db("DROP TABLE mosaics");
    query_our_db("DROP TABLE tiling_trace");
    query_our_db("DROP TABLE mosaic_progress");
    query_our_db("DROP TABLE folders");
    query_our_db("DROP TABLE folder_assignments");
    query_our_db("DROP TABLE labels");
    query_our_db("DROP TABLE points");
    query_our_db("DROP TABLE lines");
    query_our_db("DROP TABLE polygons");
    query_our_db("DROP TABLE mark_attributes");
}

query_our_db("DROP TABLE jobs");
query_our_db("DROP TABLE prediction");

$query = "CREATE TABLE `mosaics` (
	`id` INT(11) NOT NULL AUTO_INCREMENT,
	`owner_id` INT(11) NOT NULL,
	`filename` VARCHAR(256) NOT NULL,
    `identifier` VARCHAR(128) NOT NULL,
    `number_chunks` int(11) NOT NULL,
    `uploaded_chunks` int(11) NOT NULL,
    `chunk_status` VARCHAR(8096) NOT NULL,
    `md5_hash` VARCHAR(32) NOT NULL,
    `size_bytes` BIGINT NOT NULL,
    `bytes_uploaded` BIGINT DEFAULT 0,
    `tiling_progress` double default 0,
    `status` varchar(16),
	`height` INT(11),
	`width` INT(11),
    `channels` INT(11),
    `geotiff` tinyint(1),
    `coordinate_system` BLOB,
    `metadata` BLOB,
    `image_metadata` BLOB,
    `bands` BLOB,
    `utm_zone` VARCHAR(4) DEFAULT NULL,
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
    `owner_id` INT(11) NOT NULL,
	`user_id` INT(11) NOT NULL, 
	`mosaic_id` INT(11) NOT NULL, 
    `type` VARCHAR(16) NOT NULL,

	PRIMARY KEY (`user_id`, `mosaic_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1";

query_our_db($query);


$query = "CREATE TABLE `folders` (
    `folder_id` INT(11) NOT NULL AUTO_INCREMENT,
    `owner_id` INT(11) NOT NULL,
    `name` VARCHAR(128) NOT NULL,

    PRIMARY KEY (`folder_id`),
    UNIQUE KEY (`owner_id`, `name`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1";

query_our_db($query);

$query = "CREATE TABLE `folder_assignments` (
    `owner_id` INT(11) NOT NULL,
    `mosaic_id` INT(11) NOT NULL,
    `folder_id` INT(11) NOT NULL,

    PRIMARY KEY (`owner_id`, `mosaic_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1";

query_our_db($query);

$query = "CREATE TABLE `labels` (
    `label_id` INT(11) NOT NULL AUTO_INCREMENT,
    `label_name` VARCHAR(256) NOT NULL,
    `label_type` VARCHAR(32) NOT NULL,
    `label_color` VARCHAR(7),

    PRIMARY KEY (`label_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1";

query_our_db($query);

$query = "CREATE TABLE `label_mosaics` (
    `label_id` INT(11) NOT NULL,
    `mosaic_id` INT(11) NOT NULL,

    PRIMARY KEY (`label_id`, `mosaic_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1";
query_our_db($query);

$query = "CREATE TABLE `label_access` (
    `label_id` INT(11) NOT NULL,
    `user_id` INT(11) NOT NULL,
    `access` VARCHAR(2) NOT NULL,

    PRIMARY KEY (`label_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1";
query_our_db($query);



$query = "CREATE TABLE `points` (
    `point_id` INT(11) NOT NULL AUTO_INCREMENT,
    `owner_id` INT(11) NOT NULL,
    `mosaic_id` INT(11) NOT NULL,
    `label_id` INT(11) NOT NULL,
    `cx` double NOT NULL,
    `cy` double NOT NULL,
    `radius` double NOT NULL,

    PRIMARY KEY (`point_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1";

query_our_db($query);

$query = "CREATE TABLE `lines` (
    `line_id` INT(11) NOT NULL AUTO_INCREMENT,
    `owner_id` INT(11) NOT NULL,
    `mosaic_id` INT(11) NOT NULL,
    `label_id` INT(11) NOT NULL,
    `x1` double NOT NULL,
    `x2` double NOT NULL,
    `y1` double NOT NULL,
    `y2` double NOT NULL,

    PRIMARY KEY (`line_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1";

query_our_db($query);

$query = "CREATE TABLE `rectangles` (
    `rectangle_id` INT(11) NOT NULL AUTO_INCREMENT,
    `owner_id` INT(11) NOT NULL,
    `mosaic_id` INT(11) NOT NULL,
    `label_id` INT(11) NOT NULL,
    `x1` double NOT NULL,
    `x2` double NOT NULL,
    `y1` double NOT NULL,
    `y2` double NOT NULL,

    PRIMARY KEY (`rectangle_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1";

query_our_db($query);


$query = "CREATE TABLE `polygons` (
    `polygon_id` INT(11) NOT NULL AUTO_INCREMENT,
    `owner_id` INT(11) NOT NULL,
    `mosaic_id` INT(11) NOT NULL,
    `label_id` INT(11) NOT NULL,
    `points_str` BLOB NOT NULL,

    PRIMARY KEY (`polygon_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1";

query_our_db($query);

$query = "CREATE TABLE `mark_attributes` (
    `mark_id` int(11) NOT NULL,
    `attribute_key` varchar(125) NOT NULL,
    `attribute_value` varchar(125) NOT NULL,

    KEY `mark_id` (`mark_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1";

query_our_db($query);


$query = "CREATE TABLE `jobs` (
    `job_id` INT(11) NOT NULL AUTO_INCREMENT,
    `owner_id` INT(11) NOT NULL,
    `mosaic_id` INT(11) NOT NULL,
    `label_id` INT(11) NOT NULL,
    `name` VARCHAR(128) NOT NULL,

    PRIMARY KEY (`job_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1";

query_our_db($query);

$query = "CREATE TABLE `prediction` (
    `prediction_id` INT(11) NOT NULL AUTO_INCREMENT,
    `job_id` INT(11) NOT NULL,
    `owner_id` INT(11) NOT NULL,
    `mosaic_id` INT(11) NOT NULL,
    `label_id` INT(11) NOT NULL,
    `mark_id` INT(11) NOT NULL,
    `prediction` double NOT NULL,
 
    PRIMARY KEY (`prediction_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1";

query_our_db($query);





?>
