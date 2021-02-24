const config = require('axios');

const axios = config.create({
    baseURL: 'http://localhost:5000/',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
  });

module.exports = axios 