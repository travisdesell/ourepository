

import React from 'react';
import {Link, Route, Redirect} from "react-router-dom";
import emitter from "../services/emitter"


const Sidebar = (props) => {

    const [header, setHeader] = React.useState(<></>);
    const [content, setContent] = React.useState(<></>);

    React.useEffect(()=>{
        emitter.addListener("updateHeader",(header)=>{
            setHeader(header)
        })
        emitter.addListener("updateContent",(header)=>{
            setContent(header)
        })
    },[])

      return (<>

            <div class="fixed h-full bg-gray-700 left-0" style={{width: "16vw"}}>

                <div class="m-32"></div>
                <div class="absolute h-40 w-full">
                    {header}
                </div>

            </div>
              </>
      );
};

export default Sidebar;
