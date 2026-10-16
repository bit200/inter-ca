import React, {useState, useEffect} from 'react';
import _ from 'underscore';

import {
    Link, Outlet, useNavigate
} from "react-router-dom";
import {handleQuestionDenied} from './questionAccessDenied'
import CodeRun from './Suggest/CodeRun'
import {safeBackPath} from './Suggest/courseTopicUrl'


function CodeRunWrap(props) {
    const navigate = useNavigate();
    let [curCasesStr, setCurCasesStr] = useState('');
    let [jsDetails, setJsDetails] = useState({});
    let [history, setHistory] = useState({});
    let [data, setData] = useState({});
    let [solved, setSolved] = useState(false);
    let backPath = safeBackPath(new URLSearchParams(window.location.search).get('back'));

   //console.log('*........ ## ROOT RENDER', props);

    function getQuestionId() {
        return new URLSearchParams(window.location.search).get('question') || window.location.href.split('=')[1] || 1061
    }

    function saveChanges(code, file, testCase) {
       //console.log("code4444", testCase)
        global.http.post('/save-solution', {
            fnName: jsDetails.fnName,
            question: (data.question || {})._id,
            file,
            testCase,
            code,
            isLogs: 1,
        })
            .then(r => {
                // cb && cb();
            })
    }

    function saveLogsChanges(logsReader) {
        // console.log("code4444", logsReader)
        global.http.post('/save-logs-reader', {question: (data.question || {})._id, logsReader})
            .then(r => {
                // cb && cb();
            })
    }

    function saveChangesCases(testCasesStr) {
       //console.log("code4444", testCasesStr)
        global.http.post('/save-test-cases', {question: (data.question || {})._id, testCasesStr})
            .then(r => {
                // cb && cb();
            })
    }

    useEffect(() => {
        global.http.get('/load-question-run', {question: getQuestionId()}, {no_refresh: true})
            .then(r => {
               //console.log("aaaaaa", r)
                let {jsDetails} = r;
                setHistory(r.history)
                // setCode(((r.history || {}).files || {})[''] || r.starter)
                setData(r)
                setCurCasesStr(jsDetails.pubCasesStr)
                setJsDetails(jsDetails)

                // setTimeout(() => {
                //     run()
                // }, 100)
            })
            .catch(e => {
                handleQuestionDenied(e, {
                    notify: window.notify, message: t('questionNotInCourses'),
                    go: path => navigate(path)
                })
            })
    }, [])


    // let v = useActionData();
    return <div>
        {backPath && <div className={'tr'} style={{padding: '8px 12px'}}>
            <a className={'btn btn-sm ' + (solved ? 'btn-success' : 'btn-light')}
               data-testid={'run-back-to-course'}
               href={backPath}>
                <i className="iconoir-nav-arrow-left"></i> {solved ? t('backToCourseSolved') : t('backToCourse')}
            </a>
        </div>}
        <CodeRun
            onSubmitResults={(r) => { if (r && !r.wrongCount) setSolved(true) }}
            question={data.question}
            onChangeCurStr={(v) => {
               //console.log("on chagne str", v)
                saveChangesCases(v)
                // if (question && question._id && v) {
                //     let questionId = question._id;
                //     history[questionId] ??= {}
                //     history[questionId].curCasesStr = v;
                //     setHistory({ ...history })
                //     updateExam(history[questionId], questionId)
                // }

            }}
            onChangeLogs={(v) => {
               //console.log("on chagne logs reader", v)
                saveLogsChanges(v)
            }}
            onChangeCode={(v, fileName, testCase) => {
                saveChanges(v, fileName, testCase)
                // let questionId = question._id;
                // history[questionId] ??= {}
                // history[questionId].files = {'': v};
                // setHistory({ ...history })
                // console.log("qqqqq on change code is changed", history[questionId], history, questionId);

                // updateExam(history[questionId], questionId)
            }
            }
            history={data.history}
            jsDetails={data.jsDetails}
            isExam={true}
        ></CodeRun>
    </div>
}

export default CodeRunWrap
