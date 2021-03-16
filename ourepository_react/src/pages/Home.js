import React from 'react';
import ReactSignupLoginComponent from 'react-signup-login-component';
import navbarService from "../services/navbar"
import { withRouter , Redirect, Link } from "react-router-dom";

const HomePage = (props) => {

  React.useEffect(()=>{
    navbarService.setHeading(<Link to="/">OURepository</Link>)
    navbarService.setToolbar([])

},[])

      return (
        <div class="bg-black shadow-md rounded px-8 pt-6 pb-8 mb-4 flex flex-col">
        OURepository
    </div>
    );
};

export default HomePage;