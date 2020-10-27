import React from 'react';
import logo from './logo.svg';
import './App.css';
import ReactSignupLoginComponent from 'react-signup-login-component';
import LoginPage from './pages/Login';
import Nav from './pages/Nav';
import {Redirect, Route, Switch, BrowserRouter} from "react-router-dom";
import HomePage from './pages/Home';
import LandingPage from './pages/Landing';
import emitter from "./services/emitter"
import Sidebar from './components/Sidebar';
import OrganizationPage from './pages/Organization';
function App() {
  const protected_routes = [
    {path: "/landing", page: LandingPage},
    {path: "/organization" ,page: OrganizationPage}
  ]
  const [protectedRoutes, setProtectedRoutes] = React.useState([])
  React.useEffect(()=>{
    if (localStorage.getItem('user')) {
      setProtectedRoutes(protected_routes)
    }else{
      setProtectedRoutes([])
    }

    emitter.addListener("storage", () => {
      if (localStorage.getItem('user')) {
        setProtectedRoutes(protected_routes)
      }else{
        setProtectedRoutes([])
      }
    });
    
      

    },[])
  return (
      <div className="App">        

      <BrowserRouter forceRefresh={true}>
        <header className="App-header">
          <Nav></Nav>
          {localStorage.getItem("user") ? <Sidebar></Sidebar> : <></>}




        <Switch>
        <Route exact path="/" >
          {localStorage.getItem("user") ? <Redirect to="/landing" /> : <HomePage></HomePage>}
        </Route>
        <Route path="/login" component={LoginPage}></Route>
        {protectedRoutes.map((route)=>{

          return <Route path={route.path} component={route.page}></Route> 

        })}

        </Switch>
        

        </header>      
        </BrowserRouter>

    </div>

  );
}

export default App;
