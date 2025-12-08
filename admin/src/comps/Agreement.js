import React, {useState} from 'react';

function Layout2(props) {
    //console.log('*........ ## ROOT RENDER', props);


    // let v = useActionData();
    return <div className={'container-xxl'}>
        <div className="row">
            <div className="col-sm-12">
                <div className="card-body">
                    <div style={{zoom: 2, padding: '10px 0'}}>Good Morning, James!</div>
                </div>
            </div>
            <div className="col-sm-3 sticky2">
                <div className="card">
                    <div className="card-body">
                        <div className="d-flex align-items-start flex-column w-100">
                            <ul className="navbar-nav mb-auto w-100">
                                <li className="menu-label pt-0 mt-0">
                                    <span>Main Menu</span>
                                </li>
                                <li className="nav-item">
                                    <a className="nav-link active" href="#sidebarDashboards"
                                       data-bs-toggle="collapse"
                                       role="button" aria-expanded="false" aria-controls="sidebarDashboards">

                                        <span>1.2 Dashboards</span>
                                    </a> <a className="nav-link" href="#sidebarDashboards"
                                            data-bs-toggle="collapse"
                                            role="button" aria-expanded="false"
                                            aria-controls="sidebarDashboards">
                                    <i className="iconoir-home-simple menu-icon"></i>
                                    <span>Dashboards</span>
                                </a>

                                </li>
                            </ul>
                            <div className="update-msg text-center">
                                <div
                                    className="d-flex justify-content-center align-items-center thumb-lg update-icon-box  rounded-circle mx-auto">
                                    <i className="iconoir-peace-hand h3 align-self-center mb-0 text-primary"></i>
                                </div>
                                <h5 className="mt-3">ИТК-Академия</h5>
                                <p className="mb-3 text-muted">
                                        Возможность делать налоговый вычет мат. капитала
                                </p>
                                <a href="javascript: void(0);"
                                   className="btn text-primary shadow-sm rounded-pill">Резидент Сколково.</a>
                                <a href="javascript: void(0);"
                                   className="btn text-primary shadow-sm rounded-pill">Государственная лицензия на образовательную деятельность.</a>
                            </div>
                        </div>
                    </div>
                </div>
                {/*<div className="card">*/}
                {/*    <div className="card-body2">*/}
                {/*        <img src="/main.jpg" alt=""/>*/}
                {/*    </div>*/}
                {/*</div>*/}
            </div>
            <div className="col-sm-9">
                <div className="card">
                    <div className="card-body">
                        <div className="row">
                            <div className="col-sm-7">77
                                <div className={'hvh'}> asdfasdf</div>
                            </div>
                            <div className="col-sm-5 sticky2">
                                <div style={{background: 'red'}}>
                                    555
                                </div>
                            </div>
                        </div>
                        <div className="row">

                            <div className="col-sm-7">
                                <div className={'hvh'}> asdfasdf</div>
                            </div>
                            <div className="col-sm-5 sticky2">afsdfasdf</div>
                        </div>
                        <div className="row">
                            <div className="col-sm-7">
                                <div className={'hvh'}> asdfasdf</div>
                            </div>
                            <div className="col-sm-5 sticky2">xxxxxx</div>
                        </div>
                        <div className="row">
                            <div className="col-sm-7">
                                <div className={'hvh'}> asdfasdf</div>
                            </div>
                            <div className="col-sm-5 sticky2">xxxxxx</div>
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-sm-12">
                            <img src="/main.jpg" alt=""/>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </div>
}

export default Layout2
