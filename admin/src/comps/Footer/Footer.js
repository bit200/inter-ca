import React, {useState} from 'react';

function Layout2(props) {
    let fullYear = new Date().getFullYear();
    return <footer className="footer text-center text-sm-start d-print-none">
        <div className="container-xxl">
            <div className="row">
                <div className="col-12">
                    <div className="card mb-0 rounded-bottom-0">
                        <div className="card-body">
                            <p className="text-muted mb-0">

                                ©2023-{fullYear} {nameFn('footerLeft')}

                                <span className="text-muted d-none d-sm-inline-block float-end">
                                               {nameFn('footerTitle1')}
                                    <i className="iconoir-heart text-danger"
                                       style={{padding: '3px', marginBottom: '-6px'}}></i>
                                    {nameFn('footerTitle2')}</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </footer>
}

export default Layout2
