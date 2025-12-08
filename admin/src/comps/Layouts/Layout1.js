import React, {useState} from 'react';
import _ from 'underscore';
import Header1 from './../Header/Header1';
import Footer from './../Footer/Footer';

import {
    Link, Outlet
} from "react-router-dom";


function Layout2(props) {


    // let v = useActionData();
    return <>
        <Header1></Header1>
        {/*<Link to={"/"}>Home</Link>*/}
        {/*<Link to={"/login"}>Login</Link>*/}
        {/*<Link to={"/user"}>User</Link>*/}
        {/*<Link to={"/user/223"}>User22</Link>*/}

        {/*<Link to={"/team"}>team</Link>*/}
        <div className="page-wrapper">
            <div className="page-content">
                <div className="container-xxl">
                    <div className={'mainWrapPadd'}>
                        <div className={'mainWrapPadd2'}>
                            <Outlet></Outlet></div>
                    </div>
                </div>
                <Footer></Footer>
            </div>
        </div>
    </>
}

export default Layout2
