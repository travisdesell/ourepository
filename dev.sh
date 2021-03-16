export DEFAULT_DOMAIN=localhost

#Port the PHP Server is Running on
export PHP_PORT=5000
export PHP_DOMAIN=$DEFAULT_DOMAIN

#Port the React Server Runs on
export REACT_PORT=3000
export REACT_DOMAIN=$DEFAULT_DOMAIN
export PORT=$REACT_PORT
export REACT_APP_PHP_PORT=$PHP_PORT
export REACT_APP_PHP_DOMAIN=$PHP_DOMAIN

cd www; composer install; cd ..
cd ourepository_react; npm i; cd ..
php ./db/create_tables.php
php -S localhost:$PHP_PORT -t www/ &
php ./scripts/tile_daemon.php &
npm start --prefix ourepository_react/
