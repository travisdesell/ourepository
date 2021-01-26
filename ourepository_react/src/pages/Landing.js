import React from 'react';
import { Link } from "react-router-dom";
import navbarService from "../services/navbar"
import sidebarSerice from "../services/sidebar"
import apiService from "../services/api"

const LandingPage = (props) => {

  const [image, setImage] = React.useState("")

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
  },[])
      return (
        <div class="bg-gray-600 shadow-md rounded px-8 pt-6 pb-8 mb-4 flex ">

          <div class="bg-gray-700 shadow-md rounded px-8 pt-6 pb-8"> Your Organizations
          <img src={image} style={{width:"100%"}}></img>
          <div class=" p-1"></div>

          <div class="bg-gray-800  shadow-md rounded px-4 pt-3 pb-4"><Link to="/organization/eyeinthesky">Eye In The Sky</Link> </div>

        </div>

        {/* <div class=" p-1"></div>
        <div class="flex-col ">
          <div class="bg-gray-800  shadow-md rounded px-8 pt-6 pb-8"> Create Organization</div>
          <div class=" p-1"></div>
          <div class="bg-gray-900  shadow-md rounded px-8 pt-6 pb-8"> Join Organization</div>
        </div> */}

    </div>
    );
};

export default LandingPage;