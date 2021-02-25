const config = require('axios');

const axios = config.create({
    baseURL: 'http://localhost:5000/',
    headers: {'Content-Type': 'application/x-www-form-urlencoded', "alg":"HS256"}
  });

module.exports = axios 