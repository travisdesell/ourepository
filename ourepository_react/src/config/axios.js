const config = require('axios');
const { REACT_APP_PHP_DOMAIN, REACT_APP_PHP_PORT } = process.env;

const axios = config.create({
    baseURL: `http://${REACT_APP_PHP_DOMAIN}:${REACT_APP_PHP_PORT}/`,
    headers: {'Content-Type': 'application/x-www-form-urlencoded', "alg":"HS256", xhrFields: { withCredentials: true },crossDomain: true}
  });

module.exports = axios 