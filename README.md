Dependencies:
INSTALL COMPOSER FOR PHP

Make sure mysqli is enabled for PHP

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

#### Start web servers 
##### Backend port 5000; Frontend port 3000 

```
./dev.sh

```
