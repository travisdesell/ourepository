import React from 'react';
import navbarService from "../services/navbar"
import sidebarService from "../services/sidebar"
import {Link, useRouteMatch, Switch, Route,useParams} from "react-router-dom"
import Popup from 'reactjs-popup';
import 'reactjs-popup/dist/index.css';
import Project from '../components/Project';
 
const CreateOrgPage = (props) => {
    let { id } = useParams();
    let {path, url} = useRouteMatch();


    let data = {
        name:"Eye In The Sky",
        projects:[{id:"1",name:"Wind Turbines"}]
    }


    React.useEffect(()=>{
        navbarService.setHeading(<>
            <Link class="p-3" to={`/organization/${id}`}>{data.name}</Link>
            <Popup  arrow={true} contentStyle={{ padding: '0px', border: 'none' }} trigger={<button class="w-6 bg-blue-300 rounded-full shadow-outline"><img src="/images/arrow-button-circle-down-1.png" /></button>}>
                <div>Popup content here !!</div>
            </Popup>
            </>
        )
        navbarService.setToolbar([])
        sidebarService.setHeader()
    },[])

      return (
<div class="bg-blue-900 shadow-md rounded px-8 pt-6 pb-8 mb-4 flex flex-col">
        <div class="mb-4">
          <input class="shadow placeholder-blue-500 appearance-none border rounded w-full py-2 px-3  text-black" id="email" type="email" placeholder="Email"/>
        </div>
        <div class="mb-6">
          <input class="shadow placeholder-blue-500 appearance-none border border-red rounded w-full py-2 px-3 text-black mb-3" id="password" type="password" placeholder="Password"/>
          <p class="text-red text-xs italic">Please choose a password.</p>
        </div>

        <div class="flex items-center justify-between">
          <a class="inline-block align-baseline font-bold text-sm text-black hover:text-blue-darker " href="#">
            Forgot Password?
          </a>
        </div>
    </div>
    );
};

export default CreateOrgPage; 