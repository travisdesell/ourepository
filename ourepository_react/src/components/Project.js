import React from 'react';
import {Link, useRouteMatch, Switch, Route,useParams} from "react-router-dom"


const Project = (props) => {
  let { id } = useParams();
  let name = "Wind Turbines"
  let mosaics = [
    {name:"Turbine",size:"482mb",res:"17000 x 38000", channels:4,}
  ]

    // Move to "ProjectService"
    function checkAndApplyPriviledges(){

    }

  React.useEffect(()=>{
    checkAndApplyPriviledges()

  },[])
      return (
        <>
        <div class="bg-gray-600 shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <div class="text-left">{name} 
            <div class="float-right">
              <ul>
                <li>Annotations</li>

              </ul>
            </div>
          </div>
         
        </div>
        <div>hello</div>
        </>
    );
};

export default Project;