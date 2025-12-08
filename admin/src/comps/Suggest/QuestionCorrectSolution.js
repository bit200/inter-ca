import React, {useEffect, useState} from 'react';
import _ from 'underscore';

import {
    Link, Outlet
} from "react-router-dom";
import Editor from "@monaco-editor/react";
import LazyEditor from "../LazyEditor/LazyEditor";


function getFileExt(name) {
    let arr = (name || '').split('.')
    let last = arr[arr.length - 1];
    let ext = last === 'css' ? 'css' : last === 'html' ? 'html' : last === 'ts' ? 'typescript' : 'javascript';

    return ext;
}

function Layout2(props) {
    function getRest() {
        return Math.max(0, props.total - Math.round((new Date().getTime() - props.start) / 1000))
    }


    let [selectedSolutionFileInd, setSelectedSolutionFileInd] = useState(0);
    let [rest, setRest] = useState(getRest())

    useEffect(() => {
        console.log("qqqqq init interval",);
        let interv = setInterval(() => {
            let _rest = getRest()
            if (_rest != rest) {
                setRest(_rest)
            }
            console.log("qqqqq interval", props.start);
        }, 1000)
        return () => {
            clearInterval(interv)
        }
    }, [])
    let {details} = props;
    details ??= {}
    let {files = [{name: ''}]} = details;
    let data = {details}

    let selectedSolutionFileName = (files[selectedSolutionFileInd] || {}).name
    let isFiles = files.length > 1;

    function pub(v) {
        return v < 10 ? '0' + v : v;
    }


    return <>
        {isFiles && (files || []).map((it, ind) => {
            return <div
                onClick={() => {
                    setSelectedSolutionFileInd(ind)
                }}
                className={'ib filesItem ' + (ind === selectedSolutionFileInd ? 'correct' : '')}>{it.name || '-'}</div>
        })}
        {rest > 0 && <div className="tc">
            <img src="/st/lock.svg" alt="" style={{width: '350px', marginTop: '30px'}}/>
            <div>
                <hr/>
                <small style={{marginBottom: '5px', display: 'block'}}>{t('dontReloadPage')}</small>
                <div></div>
                <h5>
                    {t('correctSolutionAvailableIn')}
                </h5>
                <h1 className={'tc'}>

                    {pub(Math.round(rest / 3600))}:{pub(Math.floor(rest / 60))}:{pub(rest % 60)}
                </h1>
            </div>
        </div>}
        {(!rest || (rest <= 0)) &&
        <LazyEditor
            // height="calc(100vh - 150px)"
            height="100%"
            defaultLanguage={getFileExt(selectedSolutionFileName)}
            language={getFileExt(selectedSolutionFileName)}
            value={
                ((details.solutionFiles || {})[selectedSolutionFileName]) || ((details || {}).correctSolution) || ''
            }
            onChange={(solution) => {
                //console.log("qqqqq ignore changes", );
            }}
        />}
    </>
}

export default Layout2
