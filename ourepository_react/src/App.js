import React from 'react';
import logo from './logo.svg';
import './App.css';
import ReactSignupLoginComponent from 'react-signup-login-component';
import LoginPage from './pages/Login';
import Nav from './pages/Nav';
import {Link, Route, Switch, BrowserRouter} from "react-router-dom";
import HomePage from './pages/Home';
function App() {
  return (
      <div className="App">        
      <BrowserRouter>
        <header className="App-header">
        <Nav></Nav>

        <Switch>
        <Route exact path="/" component={HomePage}></Route>
        <Route path="/login" component={LoginPage}></Route>
        </Switch>
        

        </header>      
        </BrowserRouter>

    </div>

  );
}

export default App;
