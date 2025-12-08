import React, {useState} from 'react';
import _ from 'underscore';
import Smart from './Smart';
import Table from './Table';
import Input from './Input';

import {
    Link, Outlet
} from "react-router-dom";


function DefList(params) {
    let {props} = params || {};
    let [count, setCount] = useState(0);
    // console.log('*........ ## ROOT RENDER1', props);

    global.mainRefresh = () => {
        setCount(new Date().getTime())
    }
    // console.log("qqqqqprops", props);
    // const [obj, setObj] = useState({});

    return <div className={'row justify-content-center'}>
        <div className={'col-12'}>
            <div className="card table-pointer">
                <Table
                    woModal={props.woModal}
                    items={props.items}
                    onChange={props.onChange}
                    onSelect={props.onSelect}
                    opts={props}
                    TableFilter1={props.TableFilter1}
                    TableFilter2={props.TableFilter2}
                    Component={props.Component}
                ></Table>
            </div>
        </div>
    </div>
}

export default DefList
