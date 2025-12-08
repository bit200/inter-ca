import React, {useState, useEffect} from 'react';
import _ from 'underscore';

import {
    Link, Outlet
} from "react-router-dom";
import CodeRun from './Suggest/CodeRun'


function CodeRunWrap(props) {
    let [curCasesStr, setCurCasesStr] = useState('');
    let [jsDetails, setJsDetails] = useState({});
    let [history, setHistory] = useState({});
    let [data, setData] = useState({});

   //console.log('*........ ## ROOT RENDER', props);

    function getQuestionId() {
        return window.location.href.split('=')[1] || 1061
    }

    function saveChanges(code, file, testCase) {
       //console.log("code4444", testCase)
        global.http.post('/save-solution', {
            fnName: jsDetails.fnName,
            question: (data.question || {})._id,
            file,
            testCase,
            code
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
        global.http.get('/load-question-run', {question: getQuestionId()})
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
    }, [])


    // let v = useActionData();
    return <div>
        <CodeRun
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
