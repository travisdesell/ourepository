const fetch = require('node-fetch');

class ApiService {

    sampleRequest(){
        return fetch("http://localhost:5000/request.php?id_token=1&request=IMAGE&mosaic_id=1&file=benzene.png", {
            method: 'GET'
          }
          )
    }


    createUser(name){
        return fetch(`http://localhost:5000/test_bed.php`, {
            method: 'POST',
            mode: 'cors',
            headers: {
                // 'Content-Type': 'application/json',
                'Access-Control-Allow-Origin':'*',
                'Content-Type': 'application/x-www-form-urlencoded'
              },
            body:new URLSearchParams({
                request:"CREATE_USER",
                name: name,
                id_token:1
            }) 
          }
          )   
    }

}

const apiService = new ApiService()

export default apiService 
 
 