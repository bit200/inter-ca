import React, {useEffect, useState} from 'react';
import RenderQuizResults from "./Suggest/RenderQuizResults";
import MDEditor from "@uiw/react-md-editor";
import LogsStarterPreview from "./Suggest/LogsStarterPreview";
import LazyEditor from "./LazyEditor/LazyEditor";
import MyImg from "./MyImg";
import './examResults.css'

function ExamResultsVs(props) {
    let {vs, hist, runHist} = props || {}
    hist ??= {}
    vs ??= {}
    let session_id = hist.session_id;

    let [info, setInfo] = useState({})
    console.log("qqqqq vsvsvsvs", vs, hist);
    // useEffect(() =>{
    //     global.http.get('/load-session-unit-tests', {session_id}).then(r => {
    //         setInfo(r?.test_info || {})
    //     })
    // }, [session_id])
    let {status, total, passed, failed} = (runHist || {})[session_id] || {}

    let obj = {
        'ok': 'correct',
        'err': 'incorrect'
    }
    return <div>
        {vs.name}
        <hr/>

        {t('Status')}: {t(obj[status] || 'test_pending')}
        <div></div>
        {t('coding_lng')}: {hist.lng}
        {!!total && <>
            <hr/>
            <div>
                {t('total')}: {total}
            </div>
            <div>
                {t('correct')}: {passed}
            </div>
            <div>
                {t('incorrect')}: {failed}
            </div>
        </>}
    </div>
}

function isVsOk(it, vsHistory) {
    return false
    // let hist = vsHistory[it._id]
    // return hist[hist?.session_id]?.status == 'ok'
}


export {ExamResultsVs, isVsOk}
