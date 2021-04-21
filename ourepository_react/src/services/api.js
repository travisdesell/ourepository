const fetch = require('node-fetch');
const axios = require('../config/axios');

const url = "api_v2.php"

class ApiService {


    createUser(email,given_name,family_name,password,shake){
        return axios({
            method: 'post',
            url,
            data: new URLSearchParams({
                request:"CREATE_USER",
                email: email,
                password,
                given_name,
                family_name,
                shake:shake
            }),
            responseType: 'text'
          });
    }

    loginUser(email, password){
        return axios({
            method: 'post',
            url ,
            data: new URLSearchParams({
                request:"LOGIN_USER",
                email: email,
                password,
            }),
            withCredentials: true,
            responseType: 'text'
          });
    }

    isAuth(){
        return axios({
            method: 'get',
            url ,
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
            url ,
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
            url ,
            data: new URLSearchParams({
                request:"CREATE_ORG",
                name,
                visible,
            }),
            withCredentials: true,
            responseType: 'text'
          });
    }

    getOrgs(){
        return axios({
            method: 'get',
            url ,
            params: {
                request:"GET_ORGS"
            },
            withCredentials: true,
            responseType: 'text'
          });
    }

    getOrgByName(name){
        return axios({
            method: 'get',
            url ,
            params: {
                request:"GET_AUTH_ORG_BY_NAME",
                name
            },
            withCredentials: true,
            responseType: 'text'
          });
    }

    hasPermission(permission,organization){
        return axios({
            method: 'get',
            url ,
            params: {
                request:"HAS_ORG_PERMISSION",
                permission,
                organization
            },
            withCredentials: true,
            responseType: 'text'
          });
    }

    getOrgRoles(organization){
        return axios({
            method: 'get',
            url ,
            params: {
                request:"GET_ORG_ROLES",
                organization
            },
            withCredentials: true,
            responseType: 'text'
          });
    }
    getRolePermissions(role){
        return axios({
            method: 'get',
            url ,
            params: {
                request:"GET_ROLE_PERMISSIONS",
                role_id: role['id'] 
            },
            withCredentials: true,
            responseType: 'text'
          });
    }

    changeRolePermissions(role, changes){
        return axios({
            method: 'post',
            url ,
            data: new URLSearchParams({
                request:"CHANGE_ROLE_PERMISSIONS",
                role_id: role['id'],
                changes
            }),
            withCredentials: true,
            responseType: 'text'
          });
    }

    addRole(role_name, changes){
        return axios({
            method: 'post',
            url ,
            data: new URLSearchParams({
                request:"ADD_ROLE",
                role_name,
                changes
            }),
            withCredentials: true,
            responseType: 'text'
          });
    }

    deleteRole(role){
        return axios({
            method: 'post',
            url ,
            data: new URLSearchParams({
                request:"DELETE_ROLE",
                role_id: role['id']
            }),
            withCredentials: true,
            responseType: 'text'
          });
    }

}

const apiService = new ApiService()

export default apiService 
 
 