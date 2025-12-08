import React, {useEffect, useState} from 'react';
import _ from 'underscore';

import {
    Link, Outlet
} from "react-router-dom";
import LazyEditor from "../LazyEditor/LazyEditor";


function Layout2(props) {
    let [starter, setStarter] = useState("")
    let [loading, setLoading] = useState(true)
    let [error, setError] = useState();
    useEffect(() => {
        global.http.get('/load-start-logs-preview', {_id: props._id}).then(({error, starter}) => {
            setError(error)
            setStarter(starter)
            setLoading(false)
        })
    }, [props._id])
    
    if (error || loading) {
        return <></>
    }
    return <div className={loading ? 'o4' : ''}>
        <LazyEditor
            options={{domReadOnly: true}}
            language={'javascript'}
            value={starter}
            height={'260px'}></LazyEditor>
    </div>
}

export default Layout2
