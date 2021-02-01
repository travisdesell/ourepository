# PHP Server Doc: https://www.php.net/manual/en/features.commandline.webserver.php

cd www && composer install 
cd ourrepository_react; npm i; cd ..
php ./db/create_tables.php
php -S localhost:5000 -t www/ &
php ./scripts/tile_daemon.php &
npm start --prefix ourepository_react/
