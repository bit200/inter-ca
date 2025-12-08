import React, {useState} from 'react';
import _ from 'underscore';
import './ProgressBar.css'
import {
    Link, Outlet
} from "react-router-dom";


function ProgressBar({item}) {

    let cl =  (item.perc > 70 ? 'good' : item.perc > 40 ? 'norm' : 'bad')
    return <div className={'progressBar ' + cl}>
        <div className="progressIt" style={{width: item.perc + '%'}}></div>

    </div>
}

export default ProgressBar
