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
function App() {
  const [loginRedirect, setLoginRedirect] = React.useState(<Redirect exact from="/landing" to="/" />)
  React.useEffect(()=>{
    if (localStorage.getItem('user')) {
      setLoginRedirect(<Redirect exact from="/" to="/landing" />)
    }else{
      setLoginRedirect(<Redirect from="/landing" to="/" />)
    }

    emitter.addListener("storage", () => {
      if (localStorage.getItem('user')) {
        setLoginRedirect(<Redirect exact from="/" to="/landing" />)
      }else{
        setLoginRedirect(<Redirect from="/landing" to="/" />)
      }
    });
    
      

    },[])
  return (
      <div className="App">        
      <BrowserRouter>
        <header className="App-header">
        <Nav></Nav>

        <Switch>
        {loginRedirect}
        <Route exact path="/" component={HomePage}></Route>
        <Route path="/login" component={LoginPage}></Route>
        <Route path="/landing" component={LandingPage}></Route>

        </Switch>
        

        </header>      
        </BrowserRouter>

    </div>

  );
}

export default App;
