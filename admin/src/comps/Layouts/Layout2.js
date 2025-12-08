import React, {useState} from 'react';
import _ from 'underscore';
import Header1 from './../Header/Header1';

import {
  Link, Outlet
} from "react-router-dom";


function Layout2(props) {
 //console.log('*........ ## ROOT RENDER1', props);


  // let v = useActionData();
  return <>
    <Header1></Header1>
    {/*<Link to={"/"}>Home</Link>*/}
    {/*<Link to={"/login"}>Login</Link>*/}
    {/*<Link to={"/user"}>User</Link>*/}
    {/*<Link to={"/user/223"}>User22</Link>*/}

    {/*<Link to={"/team"}>team</Link>*/}
    <div>Layout 2</div>
    <Outlet></Outlet>
  </>
}

export default Layout2
