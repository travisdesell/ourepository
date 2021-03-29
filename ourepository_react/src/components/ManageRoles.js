

import React from 'react';
import {Link, Route, Redirect} from "react-router-dom";
import emitter from "../services/emitter"
import apiService from "../services/api"


const ManageRoles = (props) => {

    const [roles, setRoles] = React.useState(null)
    const [active_role, setActiveRole] = React.useState(null)
    const [active_permissions, setActivePermissions] = React.useState(null)


    React.useEffect(()=>{
        apiService.getOrgRoles(props.id)
        .then((data) => {
            const resp = data.data
            console.log(JSON.stringify(resp));
            if(resp.code == "ORG_ROLES_RECEIVED"){
                const roles = resp.message
                setRoles(roles)
            }
        })
    },[])


    React.useEffect(()=>{
        if(roles){
            setActiveRole(roles[0])
        }
    },[roles])

    React.useEffect(()=>{
        if(active_role){
            apiService.getRolePermissions(active_role).then((data) => {
                const resp = data.data
                console.log("PERMISSIONS" + JSON.stringify(resp));

                if(resp.code == "ROLE_PERMISSIONS_RECEIVED"){
                    const permissions = resp.message
                    setActivePermissions(roles)
                }
            })
        }
    },[active_role])    

    let permissions = [
        {
            "title":"Administrator",
            "description": "Grants all permissions",
            "value":"all"
        },{
            "title":"Add Members",
            "description": "Invite users to the organization",
            "value":"add_members"
        },{
            "title":"Delete Members",
            "description": "Delete users from the organization",
            "value":"delete_members"
        },{
            "title":"View Projects",
            "description": "View projects",
            "value":"view_projects"
        },{
            "title":"Create Projects",
            "description": "Create new projects",
            "value":"create_projects"
        },{
            "title":"Share Projects",
            "description": "Create new projects",
            "value":"share_projects"
        },{
            "title":"Delete Projects",
            "description": "Delete projects",
            "value":"delete_projects"
        },{
            "title":"Share Mosaics",
            "description": "Share Mosaics",
            "value":"share_mosaics"
        },{
            "title":"Share Annotations",
            "description": "Can share annotations in the org",
            "value":"share_annotations"
        },{
            "title":"Share Models",
            "description": "Can share models in the org",
            "value":"share_models"
        }
    ]

    function changeActiveRole(idx){
        setActiveRole(roles[idx])
    }
    


      return (<>


            <div class="bg-blue-100 shadow-md rounded px-8 pt-6 pb-8 mb-4 flex w-3/5">

            <div class="bg-gray-700 shadow-md rounded px-8 pt-6 pb-8 w-3/4"> 

                    <span class="pr-3">Roles: </span>
                    <button class="bg-gray-600 border-white border shadow-md rounded px-2 pt-0 pb-1">
                        +
                    </button>
                    <button class="bg-gray-600 border-white border shadow-md rounded px-3 pt-0 pb-1">
                        -
                    </button>

                <div class="p-1"></div>

                {roles && roles.map((role, idx) => ( 
                    <div onClick={()=>changeActiveRole(idx)} class={"border-white border shadow-md rounded px-4 pt-3 pb-4 " + ((role && role==active_role) ? "bg-gray-800" : "bg-gray-400")}>
                        {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                    </div>
                ))}


                </div>
                

                <div class="bg-gray-700 shadow-md rounded px-8 pt-6 pb-8 w-full"> Permissions:
                    <ul style={{columns: 2}}> 
                    {permissions.map((permission) => (
                        <li>
                            <input type="checkbox" id={permission.value} name="permission"/>
                            <label class="pl-4" for={permission.value}>
                                <span class="text-lg">{permission.title}</span> <br/>
                                <span class="text-sm">{permission.description}</span>
                            </label>
                        </li>
                    ))}
                    </ul>
                </div>
                
            </div>          
            </>
      );
};

export default ManageRoles;
