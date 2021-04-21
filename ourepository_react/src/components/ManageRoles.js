

import React from 'react';
import {Link, Route, Redirect} from "react-router-dom";
import emitter from "../services/emitter"
import apiService from "../services/api"

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

const ManageRoles = (props) => {

    const [roles, setRoles] = React.useState(null)
    const [active_role, setActiveRole] = React.useState(null)
    const [active_permissions, setActivePermissions] = React.useState([])
    const [changes, setChanges] = React.useState({})
    const [add_view, setAddView] = React.useState(false)
    const [role_name, setRoleName] = React.useState(false)

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
    },[add_view])


    React.useEffect(()=>{
        if(roles){
            setActiveRole(roles[0])
        }
    },[roles])

    React.useEffect(()=>{
        setChanges({})
    },[active_permissions, add_view])

    React.useEffect(()=>{
        if(active_role){
            apiService.getRolePermissions(active_role).then((data) => {
                const resp = data.data
                console.log("PERMISSIONS" + JSON.stringify(resp));

                if(resp.code == "ROLE_PERMISSIONS_RECEIVED"){
                    const permissions = resp.message
                    let perms = []
                    for (let perm of permissions) {
                        perms.push(perm["permission"])
                    }
                    setActivePermissions(perms)
                }
            })
        }
    },[active_role])    

    function changeActiveRole(idx){
        setActiveRole(roles[idx])
    }

    function changePermission(event){
        let target = event.target
        console.log(target.checked);

        const newChanges = Object.assign({}, changes);

        if(newChanges[target.id]){
            delete newChanges[target.id]
        }else{
            newChanges[target.id] = target.checked 
        }

        if(!add_view && target.checked && active_permissions.includes(target.id)){
            delete newChanges[target.id]
        }

        setChanges(newChanges)
    }

    function submitChanges(){
        apiService.changeRolePermissions(active_role,JSON.stringify(changes))
        .then((data) => {
            const resp = data.data
            console.log("PERMISSIONS" + JSON.stringify(resp));

            if(resp.code == "ROLE_PERMISSIONS_CHANGED"){
                setActiveRole(active_role)
            }
        })
        .catch((err) => {
            console.log(err);
        })

    }

    function addView(){
        setAddView(!add_view)
    }

    function addRole(){ 
        apiService.addRole(role_name,JSON.stringify(changes))
        .then((data) => {
            const resp = data.data
            console.log("PERMISSIONS" + JSON.stringify(resp));

            if(resp.code == "ROLE_ADDED"){

                setAddView(false)
            }
        })
        .catch((err)=>{

        })
    }

    function deleteRole(){
        apiService.deleteRole(active_role)
        .then((data) => {
            const resp = data.data
            console.log("PERMISSIONS" + JSON.stringify(resp));

            if(resp.code == "ROLE_DELETED"){

                

                setAddView(true)
                setAddView(false)
            }
        })
        .catch((err)=>{

        })
        }


      return (<>


            <div class="bg-blue-100 shadow-md rounded px-8 pt-6 pb-8 mb-4 flex w-3/5">

            <div class="bg-gray-700 shadow-md rounded px-8 pt-6 pb-8 w-3/4"> 

            {
                !add_view && 
                <><span class="pr-3">Roles: </span>
                <button onClick={addView} class="bg-gray-600 border-white border shadow-md rounded px-3 pt-0 pb-1">
                    <img class="w-8" src="/images/plus.svg"></img>
                </button>
                <button onClick={deleteRole} class="bg-gray-600 border-white border shadow-md rounded px-3 pt-0 pb-1">
                    <img class="w-8" src="/images/delete.svg"></img>
                </button></>

            }

            {
                add_view && 
                <><span class="pr-3">Add Role: </span>
                <button onClick={addView} class="bg-gray-600 border-white border shadow-md rounded px-3 pt-0 pb-1">
                    <img class="w-8" src="/images/cancel.svg"></img>
                </button>
                <button onClick={addRole} class="bg-gray-600 border-white border shadow-md rounded px-3 pt-0 pb-1">
                    <img class="w-8" src="/images/checked.svg"></img>
                </button></>

            }

                <div class="p-1"></div>

                {!add_view && roles && roles.map((role, idx) => ( 
                    <div onClick={()=>changeActiveRole(idx)} class={"border-white border shadow-md rounded px-4 pt-3 pb-4 " + ((role && role==active_role) ? "bg-gray-400" : "bg-gray-8i00")}>
                        {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                    </div>
                ))} 

                {add_view && 
                <input onChange={(event) => {
                    setRoleName(event.target.value)
                }} type="text" class="text-black placeholder-gray-600" placeholder="Enter Role Name"></input>
                }


                </div>
                
                {add_view && <div class="bg-gray-700 shadow-md rounded px-8 pt-6 pb-8 w-full"> 
                    Permissions: 
                    <ul style={{columns: 2}}> 
                    {permissions.map((permission) => (
                        <li>
                            <input type="checkbox" id={permission.value} name="permission" onChange={changePermission} checked={ changes[permission.value] }/>
                            <label class="pl-4" for={permission.value}>
                                <span class="text-lg">{permission.title}</span> <br/>
                                <span class="text-sm">{permission.description}</span>
                            </label>
                        </li>
                    ))}
                    </ul>

                </div>}

               {!add_view && <div class="bg-gray-700 shadow-md rounded px-8 pt-6 pb-8 w-full"> 
                    Permissions: 
                    <ul style={{columns: 2}}> 
                    {permissions.map((permission) => (
                        <li>
                            <input type="checkbox" id={permission.value} name="permission" onChange={changePermission} checked={ (changes[permission.value] != undefined) ? !!changes[permission.value] : !!active_permissions.includes(permission.value) }/>
                            <label class="pl-4" for={permission.value}>
                                <span class="text-lg">{permission.title}</span> <br/>
                                <span class="text-sm">{permission.description}</span>
                            </label>
                        </li>
                    ))}
                    </ul>
                    <button onClick={submitChanges} disabled={add_view || Object.entries(changes).length === 0} class={"rounded text-black border-blue border-4 " + ((add_view || Object.entries(changes).length === 0) ? "bg-blue-50": "bg-blue-400") }>Change Permissions</button>

                </div>}
                
            </div>          
            </> 
      );
};

export default ManageRoles;
