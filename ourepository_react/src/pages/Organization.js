import React from 'react';
import navbarService from "../services/navbar"
import sidebarService from "../services/sidebar"
import {Link, useRouteMatch, Switch, Route,useParams} from "react-router-dom"
import Popup from 'reactjs-popup';
import 'reactjs-popup/dist/index.css';
import Project from '../components/Project';
 
const OrganizationPage = (props) => {
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
        navbarService.setToolbar([<Link to={`/organization/${id}`}>Create Project</Link>,<Link to="/">Home</Link>])
        sidebarService.setHeader(<div class="relative text-left"> 
                                      <h2 class="text-2xl underline"> Recent Projects</h2>
                                      {data.projects.map((project) => {
                                          return <h3 class="text-lg ml-8" ><Link to={`${url}/project/hello`}>{project.name}</Link></h3>  
                                      })}
                                      <div class="p-5"></div>
                                      <h2 class="text-2xl underline"> Pinned Projects</h2>
                                      {data.projects.map((project) => {
                                          return <h3 class="text-lg ml-8" ><Link to="/">{project.name}</Link></h3>  
                                      })}
                                      <div class="p-5"></div>
                                      <h2 class="text-2xl underline"> All Projects</h2>
                                      {data.projects.map((project) => {
                                          return <h3 class="text-lg ml-8" ><Link to="/">{project.name}</Link></h3>  
                                      })}
                                 </div>)
    },[])

      return (
        <div class="bg-grey-900 shadow-md rounded px-8 pt-6 pb-8 absolute left-0 top-0 pt-32 h-full" style={{marginLeft:"16vw", width:"84vw"}}>
        <Switch>
        <Route exact path={path}>
            Select A Project                
        </Route>
        <Route path={`${path}/project/:project`}>
                <Project></Project>
                
        </Route>
        </Switch>
    </div>

    );
};

export default OrganizationPage; 