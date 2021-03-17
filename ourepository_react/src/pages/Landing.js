import React from 'react';
import { Link } from "react-router-dom";
import navbarService from "../services/navbar"
import sidebarSerice from "../services/sidebar"
import apiService from "../services/api"

const LandingPage = (props) => {

  const [image, setImage] = React.useState("")
  const [organizations, setOrganizations] = React.useState(null)

  React.useEffect(()=>{
    navbarService.setHeading(<Link to="/">OURepository</Link>)
    apiService.sampleRequest()
    .then((res) => res.blob())
    .then((blob) => {
      var reader = new FileReader();
      reader.readAsDataURL(blob); 
      reader.onloadend = function() {
          var base64data = reader.result;                
          setImage(base64data);
      }
    })
    navbarService.setToolbar([])
    sidebarSerice.setHeader(<></>)

    apiService.getOrgs().then((data) => {
      console.log(data.data[0]);
      setOrganizations(data.data)
    }).catch((err) => {
      console.log(err);
    })


  },[])
      return (
        <div class="bg-gray-600 shadow-md rounded px-8 pt-6 pb-8 mb-4 flex ">

          <div class="bg-gray-700 shadow-md rounded px-8 pt-6 pb-8"> Your Organizations
          <div class=" p-1"></div>

          {organizations && organizations.map((org) => ( 
            <div class="bg-gray-800  shadow-md rounded px-4 pt-3 pb-4"><Link to={`/organization/${org.name}`}>{org.name}</Link> </div>
          ))}

        </div>
        

        <div class="bg-gray-700 shadow-md rounded px-8 pt-6 pb-8">

        <buttton class="bg-gray-600  shadow-md rounded px-4 pt-3 pb-4"><Link to="/create-org">Create Organization</Link> </buttton>
          
        </div>
        

    </div>
    );
};

export default LandingPage;