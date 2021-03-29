import React from 'react';
import navbarService from "../services/navbar"
import sidebarService from "../services/sidebar"
import Popup from 'reactjs-popup';
import 'reactjs-popup/dist/index.css';
import {Link, Redirect ,useRouteMatch, Switch, Route,useParams} from "react-router-dom"
import ManageRoles from '../components/ManageRoles';



const OrgSettingsPage = (props) => {

    let { id } = useParams();

    let tabs = [ 
        {
            "header":"Manage Organization Roles",
            "component": <ManageRoles id={id}></ManageRoles>
        },
        {
            "header":"Manage Organization Roles",
            "component": <ManageRoles id={id}></ManageRoles>
        },        {
            "header":"Manage Organization Roles",
            "component": <ManageRoles id={id}></ManageRoles>
        },        {
            "header":"Manage Organization Roles",
            "component": <ManageRoles id={id}></ManageRoles>
        },

    ]

    const [active_tab, setTab] = React.useState(tabs[0])



    React.useEffect(()=>{
        sidebarService.setHeader("Options")
        sidebarService.setContent(<>
            {tabs.map((tab => (
                <div class="bg-gray-800 border-white border shadow-md rounded px-4 pt-3 pb-4"> {tab['header']}</div>
            )))}
        </>)
    },[])


    return (
        <>{active_tab['component']}</>
    );

};

export default OrgSettingsPage; 