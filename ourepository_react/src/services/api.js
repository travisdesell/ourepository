const fetch = require('node-fetch');
const axios = require('../config/axios');

class ApiService {

    sampleRequest(){
        return fetch("http://localhost:5000/request.php?id_token=1&request=IMAGE&mosaic_id=1&file=benzene.png", {
            method: 'GET'
          }
          )
    }


    createUser(email, password,shake){
        return axios({
            method: 'post',
            url: '/test_bed.php',
            data: new URLSearchParams({
                request:"CREATE_USER",
                email: email,
                password,
                id_token:1,
                shake:shake
            }),
            responseType: 'text'
          });
    }

    loginUser(email, password){
        return axios({
            method: 'post',
            url: '/test_bed.php',
            data: new URLSearchParams({
                request:"LOGIN_USER",
                email: email,
                password,
                id_token:1
            }),
            withCredentials: true,
            responseType: 'text'
          });
    }

    isAuth(jwt){
        return axios({
            method: 'get',
            url: '/test_bed.php',
            params: {
                request:"GET_AUTH",
                jwt:jwt
            },
            responseType: 'text'
          });
    }

}

const apiService = new ApiService()

export default apiService 
 
 