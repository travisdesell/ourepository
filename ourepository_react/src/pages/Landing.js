import React from 'react';
import { Link } from "react-router-dom";
import navbarService from "../services/navbar"
import sidebarSerice from "../services/sidebar"

const LandingPage = (props) => {

  React.useEffect(()=>{
    navbarService.setHeading(<Link to="/">OURepository</Link>)
    navbarService.setToolbar([])
    sidebarSerice.setHeader(<></>)
  },[])
      return (
        <div class="bg-gray-600 shadow-md rounded px-8 pt-6 pb-8 mb-4 flex ">

          <div class="bg-gray-700 shadow-md rounded px-8 pt-6 pb-8"> Your Organizations
          <div class=" p-1"></div>

          <div class="bg-gray-800  shadow-md rounded px-4 pt-3 pb-4"><Link to="/organization">Eye In The Sky</Link> </div>

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