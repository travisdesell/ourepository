

import React from 'react';
import {Link, Route} from "react-router-dom";
import emitter from "../services/emitter"
import navbarService from "../services/navbar"
import sidebarSerice from "../services/sidebar"


const UserStatusPage = (props) => {

  const logOutBtn = <a onClick={handleLogOut} class="inline-block text-gray-600 no-underline hover:text-gray-200 hover:text-underline py-2 px-4"><Link to="/">Logout</Link></a>
  const logInBtn = <a class="inline-block text-gray-600 no-underline hover:text-gray-200 hover:text-underline py-2 px-4"> <Link to="/login">Login</Link></a>

  const [navbarOpen, setNavbarOpen] = React.useState(false);
  const [userBtn, setUserBtn] = React.useState(<></>);

  React.useEffect(()=>{


    if (localStorage.getItem('user')) {
      setUserBtn(logOutBtn)
    }else{
      setUserBtn(logInBtn)

    }
    emitter.addListener("storage", () => {
      if (localStorage.getItem('user')) {
        setUserBtn(logOutBtn)
      }else{
        setUserBtn(logInBtn)
      }
    });



    },[])


    function toggleMenu() {
      setNavbarOpen(!navbarOpen)

    }


    function handleLogOut(){
        localStorage.removeItem("user")
        setUserBtn(<a class="inline-block text-gray-600 no-underline hover:text-gray-200 hover:text-underline py-2 px-4" > <Link to="/login">Login</Link></a>)
    }





      return (<>
        <nav class="flex items-center justify-between flex-wrap bg-gray-800 p-6 fixed w-full z-10 top-0">
        <div class="flex items-center flex-shrink-0 text-white mr-6">
          <a class="text-white no-underline hover:text-white hover:no-underline">
            <span class="text-2xl pl-2"><i class="em em-grinning"></i> <Link to="/">OURepository</Link></span>
          </a>
        </div>

        <div class="block lg:hidden">
          <button id="nav-toggle" class="flex items-center px-3 py-2 border rounded text-gray-500 border-gray-600 hover:text-white hover:border-white" onClick={toggleMenu}>
            <svg class="fill-current h-3 w-3" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><title>Menu</title><path d="M0 3h20v2H0V3zm0 6h20v2H0V9zm0 6h20v2H0v-2z"/></svg>
          </button>
        </div>

        <div className={"w-full flex-grow lg:flex lg:items-center lg:w-auto lg:block pt-6 lg:pt-0" + (navbarOpen ? " flex" : " hidden")} id="nav-content">
          <ul class="list-reset lg:flex justify-end flex-1 items-center">
            <li class="mr-3">
            {userBtn}


            </li>
          </ul>
        </div>
        </nav>

        <div class="bg-gray-600 shadow-md w-1000 h-1000 rounded px-8 pt-6 pb-8 mb-4 flex ">


        <div class="flex-col ">
          <div class="bg-gray-700 shadow-md rounded w-128 h-500 px-8 pt-6 pb-8 flex-none"> pic</div>
          <div class=" p-1"></div>
          <button class="bg-blue-500 hover:bg-blue-700 text-white font-bold rounded px-8 pr-8 pt-6 pb-8 flex-none">upload profile</button>
        </div>

        <div class=" p-1"></div>

        <div class="flex-col ">
          <div class="bg-gray-800 shadow-md rounded px-8 pt-6 pb-8"> UserName</div>
          <div class=" p-1"></div>
          <div class="bg-gray-900 w-128 shadow-md rounded px-8 pt-6 pb-8"> Description Description Description Description</div>
        </div>

        <div class=" p-1"></div>
          <div class="bg-gray-800  shadow-md rounded px-8 pt-6 pb-8"> organizations</div>
        </div>

    </>
      );
};

export default UserStatusPage;
