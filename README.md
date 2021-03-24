Dependencies:
INSTALL COMPOSER FOR PHP

### Make sure mysqli is enabled for PHP

#### Create SQL DB info file
```
cat << EOF >> ./db/db_info.php
<?php
\$our_db_host="localhost:3306";
\$our_db_user="jon";
\$our_db_password="password";
\$our_db_name="our";
?>
EOF
```


#### Create settings.php  file
```
cat << EOF >> ./www/settings.php
<?php
\$CLIENT_ID = "345";
\$BASE_DIRECTORY = "./"; 
\$UPLOAD_DIRECTORY = "./mosaic_uploads";
\$ARCHIVE_DIRECTORY = "./mosaics";
?>
EOF
```

#### Start web servers 
##### Backend port 5000; Frontend port 3000 

```
./dev.sh

```

Note: if using Windows these commands will not work. instead you must manually create the db_info and settings files and manually insert the contents.

To run on windows simply type 

```
dev.sh

```


#### Populating Database Schema
while in www/
##### Windows
'''
reload_schema.bat
'''
##### Linux/Mac
'''
./reload_schema.sh
'''

### Important files

```
www/bootstrap.php
```
