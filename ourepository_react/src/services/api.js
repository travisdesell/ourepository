const fetch = require('node-fetch');
const axios = require('../config/axios');

class ApiService {

    sampleRequest(){
        return fetch("http://localhost:5000/request.php?id_token=1&request=IMAGE&mosaic_id=1&file=benzene.png", {
            method: 'GET'
          }
          )
    }


    createUser(email,given_name,family_name,password,shake){
        return axios({
            method: 'post',
            url: '/test_bed.php',
            data: new URLSearchParams({
                request:"CREATE_USER",
                email: email,
                password,
                given_name,
                family_name,
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

    isAuth(){
        return axios({
            method: 'get',
            url: '/test_bed.php',
            params: {
                request:"GET_AUTH"
            },
            withCredentials: true,
            responseType: 'text'
          });
    }

    logout(){
        return axios({
            method: 'get',
            url: '/test_bed.php',
            params: {
                request:"LOGOUT_USER"
            },
            withCredentials: true,
            responseType: 'text'
          });
    }

    createOrg(name, visible){
        return axios({
            method: 'post',
            url: '/test_bed.php',
            data: new URLSearchParams({
                request:"CREATE_ORG",
                name,
                visible,
                id_token:1
            }),
            withCredentials: true,
            responseType: 'text'
          });
    }

    getOrgs(){
        return axios({
            method: 'get',
            url: '/test_bed.php',
            params: {
                request:"GET_ORGS"
            },
            withCredentials: true,
            responseType: 'text'
          });
    }

}

const apiService = new ApiService()

export default apiService 
 
 