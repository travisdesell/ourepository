import React from 'react';
import { useParams } from "react-router-dom";
import navbarService from "../services/navbar"
import sidebarService from "../services/sidebar"
import {Link} from "react-router-dom"

const OrganizationPage = (props) => {
    let { id } = useParams();

    React.useEffect(()=>{
        navbarService.setHeading(<Link to="/organization">Eye In The Sky</Link>)
        navbarService.setToolbar([<Link to="/organization">Create Project</Link>,<Link to="/">Home</Link>])
        sidebarService.setHeader(<h2 class="text-xl"> Projects</h2>)
    },[])

      return (
        <div class="bg-black shadow-md rounded px-8 pt-6 pb-8 mb-4 flex flex-col">
        Organization
    </div>
    );
};

export default OrganizationPage; 