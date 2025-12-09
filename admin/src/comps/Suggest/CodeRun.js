import React, {useEffect, useRef, useState} from 'react';
import _ from 'underscore';
import MDEditorComp from './MDEditorComp';
import {
    Link, Outlet
} from "react-router-dom";
// import './codeRun.scss'
import MDEditor from "@uiw/react-md-editor";
import MyModal from 'libs/MyModal';
import QuestionDetails from "./QuestionDetails";
import Smart from 'libs/Smart';
import {statuses} from './Table';
import QuizQuestion from "./QuizQuestion";
import Textarea from 'libs/Textarea';
import functionsStr from './FunctionsStr'
import user from 'libs/user/user'
import QuestionCorrectSolution from "./QuestionCorrectSolution";
import CustomStorage from "./CustomStorage";
import LazyEditor from "../LazyEditor/LazyEditor";
import ConfirmModal from "../../libs/ConfirmModal/ConfirmModal";
import Check from "../StarRating";
import ColorTheme from "../ColorTheme";

let renderCount = 1;

function QuestionSolution() {
    return null;
}

let dragInit = {}
let startTime = 0;

function CodeRunComponent(props) {
    let [code, setCode] = useState('');
    let [validateErrors, setValidateErrors] = useState([]);
    let [logsReader, setLogsReader] = useState('[]');
    let {isExam, onChangeCode, onChangeLogs} = props;
    global.setHistoryObj = (histObj, v) => {
        setData({...data, historyObj: histObj[getQuestionId()]})
    };


    let [forceRenderLogs, setForceRenderLogs] = useState(-1)
    let [hintInd, setHintInd] = useState(-1)
    let [history, setHistory] = useState(-1)

    // let [files, setFiles] = useState([])//[{name: 'index.js'}, {name: 'app.css'}])

    // let [files, setFiles] = useState([{name: 'index.js'}, {name: 'app.css'}, {name: ''}])
    let [files, setFiles] = useState([])

    let [selectedFileInd, setSelectedFileInd] = useState(0)
    let [runLoading, setRunLoading] = useState(false)
    let [curCasesStr, setCurCasesStr] = useState('')
    let [cases, setCases] = useState([])
    let [jsDetails, setJsDetails] = useState({})
    let [topTab, setTopTab] = useState('condition')
    let [runResults, setRunResults] = useState({})
    let [runSubmitResults, setRunSubmitResults] = useState({})
    let [activeCaseInd, setActiveCaseInd] = useState(0)
    let [data, setData] = useState({})
    let [dragOpts, setDragOpts] = useState({})
    let [opts, setOpts] = useState({})
    const parentTopRef = useRef(null);
    const parentRightRef = useRef(null);
    const topRef = useRef(null);
    const botRef = useRef(null);
    const rightRef = useRef(null);
    const leftRef = useRef(null);
    let hintModal;
    let solutionModal;

    useEffect(() => {
        startTime = new Date().getTime()
    }, [])

    useEffect(() => {
        initExam();
    }, [(props.question || {})._id]);
    // useEffect(() => {
    // }, [curCasesStr])
    function getFileName(ind = selectedFileInd, _files) {
        ind = ind || 0;

        return ((_files || files || [])[ind] || {}).name || '';
    }

    function getStarter(jsDetails, ind = 0, fname) {
        let fileName = fname || getFileName(ind);
        //console.log("qqqqq filename", fileName, ((jsDetails.starterFiles || {})[fileName] || ''));
        return ((jsDetails.starterFiles || {})[fileName] || '') || (jsDetails.starter || '') || ''
    }

    function initExam() {
        let {jsDetails = {}, history = {}, runResults, question, cases} = props;
        history ??= {}
        history.files ??= {}

        let str = history.testCasesStr || jsDetails.curCasesStr || jsDetails.pubCasesStr || ''
        let _cases = buildTestCases(str, jsDetails.fields)
        let fileName = getFileName(0, jsDetails.files)
        let __code = !isLogsRaederFn(jsDetails) ? ((history || {}).files || {})[fileName] || getStarter(jsDetails, 0, fileName) : getStarter(jsDetails, 0, fileName);
        setCode(__code)
        setLogsReader((history || {}).logsReader || `[]`)
        // setData({})
        // console.log('history', history, jsDetails)
        setCurCasesStr(str)
        setHistory(history)
        setCases(_cases)
        setJsDetails(jsDetails)
        setRunResults(runResults)
        setFiles(jsDetails.files || [])
        return;
    }


    useEffect(() => {
        window.listenCtrlS = () => {
            // console.log("qqqqq listen",);
            setTopTab('logs');
            // onChangeCodeLocal(code);
            setForceRenderLogs(new Date().getTime());

        }

        topRef.current.style.height = Storage.get('codeResizeTop') || '70%'
        rightRef.current.style.width = Storage.get('codeResizeLeft') || '50%'
        setBotRef();
        setLeftRef();
        // if (isExam) {
        // initExam()
        // return;
        // }
        // global.http.get('/load-question-run', {question: getQuestionId()})
        //     .then(r => {
        //         let {jsDetails} = r;
        //         let _cases = buildTestCases(jsDetails.pubCasesStr, jsDetails.fields)
        //         setCode(((r.history || {}).files || {})[''] || r.starter)
        //         setData(r)
        //         setCurCasesStr(jsDetails.pubCasesStr)
        //         setCases(_cases)
        //         setJsDetails(jsDetails)
        //         // setTimeout(() => {
        //         //     run()
        //         // }, 100)
        //     })
    }, [])

    function getQuestionId() {
        return window.location.href.split('=')[1] || 1061
    }

    function run(params) {
        setTopTab('results')
        setRunLoading(true)
        //console.log("qqqqq logsReaderlogsReaderlogsReader", logsReader);
        global.http.post('/run-question', {
            curCasesStr,
            isExam,
            files: {'': code},
            logsReader,
            question: question._id || getQuestionId(),
            ...params
        })
            .then(r => {
                setRunLoading(false)
                let {wrongCount} = r

                function trySet(key, keys) {
                    let curStatus = (data.historyObj || {}).status
                    if (keys.indexOf(curStatus) < 0) {
                      try {
                        Storage.changeStatus({_id: getQuestionId(), status: key})

                      } catch(e) {}
                    }
                }


                if (params && params.isSubmit) {
                    !wrongCount && trySet('very_good', ['very_good'])

                    setRunSubmitResults(r)
                } else {
                    !wrongCount && trySet('norm', ['good', 'very_good'])
                    setRunResults(r)
                    props.onChangeRunResults && props.onChangeRunResults(r)
                    r.firstError && setActiveCaseInd(r.firstError.ind)
                }
            })
    }

    function submit() {
        run({isSubmit: true})
    }


    function setBotRef() {
        let perc = 100 - parseFloat(topRef.current.style.height);
        botRef.current.style.height = perc + '%'
    }

    function setLeftRef() {
        let perc = 100 - parseFloat(rightRef.current.style.width);
        leftRef.current.style.width = perc + '%'
    }


    function getHeight(el) {
        return el.clientHeight;
    }

    function getWidth(el) {
        return el.clientWidth;
    }

    function saveChanges(code, file, cb) {
        if (isExam) {
            //console.log("qqqqq on chagne is Exam",);
            return;
        }
        // console.log('save chnages', cases, activeCaseInd)
        // global.http.post('/save-solution', {
        //     testCase: (cases || [])[activeCaseInd || 0] || [],
        //     question: question._id, code, file})
        //     .then(r => {
        //         cb && cb();
        //     })
    }


    function buildTestCases(str, fields) {
        let size = (fields || []).length;
        if (!size) {
            return []
        }

        let res = [];
        let arr = (str || '').split("\n");
        try {

            for (let i = 0; i < arr.length; i += fields.length) {
                let d = [];
                for (let j = 0; j < size; j++) {
                    let it;
                    try {
                        let vv = eval(`let x = [{name: '124', age: 22}, {name: "age25", age: 25}];
                        x`)
                        it = JSON.parse(arr[i + j]);
                    } catch (e) {
                        it = arr[i + j]
                    }
                    d.push(it)
                }
                res.push(d)
            }
        } catch (e) {
            //console.log("qqqqq eeeeeeeee",);
        }
        return res;
    }

    function getTestCase() {
        return (cases || [])[activeCaseInd || 0] || '';
    }

    function onChangeCodeLocal(code) {
        //console.log('code444', code)

        let fileName = getFileName();
        history.files[fileName] = code;

        setCode(code);
        setHistory(history);

        if (isExam) {

            onChangeCode && onChangeCode(code, fileName, getTestCase())
        } else {
            // saveChanges(code)
        }
    }

    function onChangeLogsLocal(logs) {
        setLogsReader(logs)
        onChangeLogs && onChangeLogs(logs)
    }


    function isLogsRaederFn(jsDetails) {
        let {codeType} = jsDetails || {};
        let isLogsReader = codeType === 'logreader'
        return isLogsReader;
    }

    let directCodeSolutionModal;
    let question = props.question || (data || {}).question || {};
    let caseItem = (cases || [])[activeCaseInd]
    // let firstErrorInd = (runResults || {}).firstErrorInd
    let firstErrorInd = !runResults ? -1 : (runResults || {}).firstError ? ((runResults || {}).firstError || {}).ind : 99999;
    let casesModal;
    let isLogsReader = isLogsRaederFn(jsDetails)

    function getFileExt() {
        let name = getFileName(selectedFileInd)
        let arr = (name || '').split('.')
        let last = arr[arr.length - 1];
        let ext = last === 'css' ? 'css' : last === 'html' ? 'html' : last === 'ts' ? 'typescript' : 'javascript';

        return ext;
    }

    let isNewExam = props.isNewExam;
    return <div
        className={'codeRunWrap ' + (dragOpts.drag1 || dragOpts.drag2 ? 'dragging' + (dragOpts.drag1 ? '1' : 2) : '')}
        ref={parentRightRef}
        onMouseDown={(e) => {
            let dragKey = e.target.getAttribute('id');
            console.log("qqqqq eeee", e);
            try {

                let totalX = getWidth(parentRightRef.current)//.top
                let totalY = getHeight(parentTopRef.current)//.top
                let percX = +rightRef.current.style.width.replace('%', '')
                let percY = +topRef.current.style.height.replace('%', '')


                dragInit = {
                    percY,
                    percX,
                    totalX, totalY,
                    dx: (100 - percX) * totalX / 100 - e?.clientX || 0,
                    dy: (percY) * totalY / 100 - e?.clientY || 0,
                }
                console.log("qqqqq dragInit", dragInit);
            } catch (e) {
                console.log("qqqqq ee", e.toString());
            }
            (/drag1|drag2/gi.test(dragKey)) && setDragOpts({[dragKey]: true})
        }}
        onMouseUp={() => {
            let {drag1, drag2} = dragOpts || {};
            if (drag1 || drag2) {
                setDragOpts({})
            }
        }
        }
        onMouseMove={(e) => {
            let {drag1, drag2} = dragOpts;

            if (!drag1 && !drag2) return;
            //console.log("qqqqq MOVE",);
            if (drag1) {
                let MIN_MAX = 20
                let y = e.clientY + dragInit.dy;
                let total = dragInit.totalY || getHeight(parentTopRef.current)//.top
                let perc = Math.min(100 - MIN_MAX, Math.max(MIN_MAX, Math.round(100 * (y / total)))) + '%';
                topRef.current.style.height = perc;
                setBotRef();
                Storage.set('codeResizeTop', perc)
            } else if (drag2) {
                let MIN_MAX = 20
                let x = e.clientX + dragInit.dx;
                let total = dragInit.totalX || getWidth(parentRightRef.current)//.top
                //console.log("totaol", total, x)
                let perc = Math.min(100 - MIN_MAX, Math.max(MIN_MAX, 100 - Math.round(100 * (x / total)))) + '%';
                rightRef.current.style.width = perc;
                setLeftRef();
                Storage.set('codeResizeLeft', perc)
                console.log("qqqqq drag1, drag2", dragInit);

            }
        }
        }
    >

        <div className="crLeft" ref={leftRef}>

            <div className="crVertWrap" ref={parentTopRef}>
                <div className="crTop" ref={topRef}>
                    <div className={"vertChild rel animChild "} data-tab={topTab}
                         style={{overflowX: 'hidden', minHeight: '100%'}}>
                        <div className={'mainTasksWrap sticky3'}>
                            <div className="pull-right">
                                <div className="buttonsRun2">
                                    {!props.isNewExam && <>
                                        {!!question.hints && !!question.hints.length &&
                                            <button title="Подсказка" className={'btn btn-sm btn-light'}
                                                    onClick={() => {
                                                        setHintInd(0)
                                                        hintModal.show();
                                                    }}>
                                                <i className="iconoir-developer"></i>

                                            </button>}
                                        <button title={t('explainMsg')} className={'btn btn-sm btn-light'}
                                                onClick={() => {
                                                    solutionModal.show();
                                                }}>
                                            <span className="iconoir-multiple-pages"></span>
                                            {/*<span className="fa fa-book" style={{padding: '0'}}></span>*/}
                                        </button>

                                        <button title={t('solutionMsg')} className={'btn btn-sm btn-light'}
                                                onClick={() => {
                                                    directCodeSolutionModal.show();
                                                }}>
                                            {/*<span className="iconoir-edit"></span>*/}
                                            {/*<span className="iconoir-cloud-check"></span>*/}
                                            {/*<span className="iconoir-cloud-desync"></span>*/}
                                            {/*<span className="iconoir-cloud-desync"></span>*/}
                                            {/*<span className="iconoir-puzzle"></span>*/}
                                            {/*<span className="iconoir-code"></span>*/}
                                            {/*<span className="iconoir-doc-magnifying-glass"></span>*/}
                                            {/*<span className="iconoir-multiple-pages"></span>*/}
                                            {/*<span className="iconoir-archery-match"></span>*/}
                                            {/*<span className="iconoir-arcade"></span>*/}
                                            {/*<span className="iconoir-epository"></span>*/}
                                            {/*<span className="iconoir-slash-square"></span>*/}
                                            {/*<span className="iconoir-three-stars"></span>*/}
                                            {/*<span className="iconoir-three-stars-solid"></span>*/}
                                            {/*<span className="iconoir-alarm"></span>*/}
                                            {/*<span className="iconoir-post"></span>*/}
                                            {/*<span className="iconoir-settings"></span>*/}
                                            {/*<span className="iconoir-settings-profiles"></span>*/}
                                            {/*<span className="iconoir-terminal"></span>*/}
                                            {/*<span className="iconoir-terminal-tag"></span>*/}
                                            {/*<span className="iconoir-data-transfer-up"></span>*/}
                                            <span className="iconoir-settings-profiles"></span>
                                            {/*<span className="fa fa-code" style={{padding: '0'}}></span>*/}
                                        </button>
                                    </>}
                                    {<div
                                        className={'ib ' + (jsDetails.hideRunStatus == 'hidden' ? 'hiddenBlock' : '')}>
                                        <button className={'btn btn-sm btn-light'} disabled={runLoading}
                                                onClick={() => run()}>
                                            <i className="iconoir-terminal"></i>

                                            {t('runMsg')}
                                        </button>
                                        {!props.isNewExam &&
                                            <button className={'btn btn-sm btn-primary'} onClick={() => submit()}>
                                                {/*<i className="iconoir-double-check"></i>*/}
                                                <i className="iconoir-arcade"></i>
                                                {t('submitMsg')}
                                            </button>}
                                    </div>}

                                    <MyModal
                                        size={'md'}
                                        ref={(el) => solutionModal = el}
                                    >
                                        <QuestionDetails withoutShow={true} question={question}></QuestionDetails>
                                    </MyModal>
                                    <MyModal
                                        size={'md'}
                                        ref={(el) => directCodeSolutionModal = el}
                                    >
                                        <div style={{height: '500px'}}>
                                            <QuestionCorrectSolution details={jsDetails}
                                                                     start={startTime}
                                                                     total={300}
                                            ></QuestionCorrectSolution>
                                        </div>
                                    </MyModal>
                                    <MyModal
                                        size={'small'}
                                        ref={(el) => hintModal = el}
                                    >
                                        <HintsContent hints={question.hints}></HintsContent>
                                    </MyModal>

                                </div>
                            </div>
                            <div className="code-run-tab-wrap">
                                {([{name: 'conditionMsg', type: 'condition'}, {
                                    name: 'results',
                                    type: 'results'
                                }, !isLogsReader ? {
                                    name: 'logs',
                                    type: 'logs'
                                } : null] || []).map((it, ind) => {
                                    if (!it) return <></>
                                    return (<a className={'code-run-tab ' + (it.type == topTab ? 'active' : '')}
                                               style={{marginRight: '5px'}} key={ind} onClick={() => {
                                        setTopTab(it.type)
                                    }}>
                                        {t(it.name)}
                                    </a>)
                                })}
                            </div>
                        </div>
                        {/*<hr/>*/}

                        {topTab === 'logs' && !isLogsReader && <>
                            {/*<hr/>*/}
                            {/*Логи:*/}
                            <IframeToRunLocal
                                isNewExam={isNewExam}
                                cases={cases}
                                activeCaseInd={activeCaseInd}
                                code={code}
                                jsDetails={jsDetails}
                                question={question}
                                forceRenderLogs={forceRenderLogs}
                            ></IframeToRunLocal>
                        </>}
                        {topTab === 'condition' &&
                            <div className={'conditionWrap'}>


                                <MDEditor.Markdown data-color-mode="light"
                                                   source={question.name}/>

                                {isLogsReader && <>
                                    <hr/>
                                    Поле для ввода логов
                                    <LazyEditor
                                        height="300px"
                                        defaultLanguage="javascript"
                                        defaultValue="[]"
                                        options={{
                                            minimap: {
                                                enabled: false
                                            }
                                        }}
                                        value={logsReader}
                                        onChange={(v) => {
                                            onChangeLogsLocal(v)
                                        }
                                        }
                                    />
                                </>}
                            </div>}
                        {topTab === 'results' && <div className={'card3 ' + (runLoading ? 'o5' : '')}>
                            {/* {!isNewExam && <div style={{marginTop: '-10px'}}>
                                <QuizQuestion
                                    woName={true}
                                    question={question}
                                    historyObj={data.historyObj}
                                    onChange={(q) => {
                                       //console.log("qqqqq qqqq", q);
                                    }
                                    }
                                ></QuizQuestion>
                                <hr/>
                            </div>} */}
                            <div style={{padding: '5px'}} className={'animChild'}>

                                <div></div>
                                <small>&nbsp;</small>
                                <h5>{t('runResults')}</h5>
                                <RunResults runResults={runResults} fields={data.fields}></RunResults>
                                {!isNewExam && <>
                                    <hr/>
                                    <h5>{t('runResultsSubmit')}</h5>
                                    <RunResults runResults={runSubmitResults} fields={data.fields}></RunResults></>}
                            </div>
                        </div>}
                    </div>
                    <div className="resizeH" id={'drag1'}></div>

                </div>
                <div className="crBot" ref={botRef}>
                    <div className={"vertChild casesChild " + (isLogsReader ? 'logsRader' : '')}>

                        {!isLogsReader && <>
                            <div className="">
                                <div className="cases-wrap">
                                    {(cases || []).map((caseItem, ind) => {
                                        return (<div key={ind}
                                                     status={(firstErrorInd == -1 ? '' : (firstErrorInd > ind) ? 'ok' : firstErrorInd === ind ? 'error' : '')}
                                                     className={'btn btn-xs btn-default case-title ib ' + (activeCaseInd == ind ? 'active-case' : '')}
                                                     onClick={() => setActiveCaseInd(ind)}>
                                            <div>
                                                <span className={'run-circle'}></span> {t('case')} #{ind + 1}
                                            </div>
                                        </div>)
                                    })}
                                    <div className="ib btn btn-xs btn-default case-title"
                                         title={t('editCases')}
                                         onClick={() => {
                                             casesModal.show()
                                         }}>
                                        <i className="iconoir-edit"></i>

                                    </div>
                                    <MyModal
                                        ref={(el) => casesModal = el}
                                    >
                                        <EditCasesModal curCasesStr={curCasesStr}
                                                        onSave={(v) => {
                                                            let original = (jsDetails || {}).pubCasesStr;
                                                            let isReset = !v || (v === original);
                                                            v = v || original;
                                                            setCurCasesStr(v)
                                                            props.onChangeCurStr && props.onChangeCurStr(v)

                                                            setCases(buildTestCases(v, jsDetails.fields))
                                                            casesModal.hide();
                                                            if (isExam) {
                                                                props.onChangeCurStr && props.onChangeCurStr(v, isReset)
                                                            } else {
                                                                global.http.post('/update-test-case', {
                                                                        questionId: question._id,
                                                                        value: v,
                                                                        isReset
                                                                    }
                                                                )
                                                                    .then()
                                                            }
                                                        }
                                                        }></EditCasesModal>

                                    </MyModal>
                                </div>
                                {caseItem && (jsDetails.fields || []).map((it, ind) => {
                                    //console.log('caseItem', caseItem, ind, caseItem[ind])
                                    return (<div key={ind}>
                                        {it.name} = {JSON.stringify(caseItem[ind])}
                                    </div>)
                                })}


                            </div>
                        </>}
                        {isLogsReader && <>
                            {t('noCases')}
                        </>}
                        <hr/>
                        {(validateErrors || []).map((error, ind) => {
                            return (<div key={ind} style={{fontSize: '12px'}}>
                                Line: [{error.startLineNumber}] {error.message}
                                <hr/>
                            </div>)
                        })}
                    </div>


                </div>

            </div>
            <div className="resizeV" id={'drag2'}></div>

        </div>
        <div className="crRight" ref={rightRef}>
            <div className="filesWrap">
                <div className="btn-reset">
                    <button className={'btn btn-xs btn-light'} onClick={() => {
                        onConfirm({
                            name: t('areYouSure'),
                        }, () => {
                            onChangeCodeLocal(getStarter(jsDetails))
                        })
                    }}>
                        {t('resetCode')}
                    </button>
                </div>
                {files && files.length > 1 && (files || []).map((it, ind) => {
                    return <div
                        key={ind}
                        onClick={() => {
                            let _code = ((history || {}).files || {})[it.name] || getStarter(jsDetails, ind);
                            //console.log('zzzzzz', history, ((history || {}).files || {})[it.name], history.files)
                            setSelectedFileInd(ind)
                            setCode(_code)
                        }}
                        className={'ib filesItem ' + (ind === selectedFileInd ? 'selectedFile' : '')}>{it.name || '-'}</div>
                })}
            </div>
            {jsDetails._id}

            <SmartCodeEditor
                {...{
                    getFileExt, isLogsReader, code, setValidateErrors, onChangeCodeLocal,
                    reRender: ((isLogsReader ? 'READ' : 'EDIT') + '___' + (props.question || {})._id || '--') + '_' + selectedFileInd
                }}
            ></SmartCodeEditor>
        </div>
    </div>
}

function SmartCodeEditor({getFileExt, code, reRender, setValidateErrors, onChangeCodeLocal, isLogsReader}) {
    let [loading, setLoading] = useState(false);
    //console.log("qqqqq smart editor44444444", code, isLogsReader, reRender);
    useEffect(() => {
        setLoading(true)
        setTimeout(() => {
            setLoading(false)
        })
    }, [reRender])
    if (loading) {
        return <></>
    }
    return <LazyEditor
        height="calc(100% - 12px)"
        defaultLanguage={getFileExt()}
        language={getFileExt()}
        defaultValue=""
        options={{
            readOnly: isLogsReader,
            minimap: {
                enabled: false
            }
        }}
        onValidate={(e) => {
            // if (isLogsReader) {
            //     return;
            // }
            setValidateErrors(e)
            // console.log("qqqqq on validate", e);
        }
        }
        value={code}
        onChange={(v) => {
            // if (isLogsReader) {
            //     return;
            // }
            if (v != code) {
                onChangeCodeLocal(v)
            }

        }
        }
    />
}


function EditCasesModal(props) {
    let [str, setStr] = useState('')
    useEffect(() => {
        setStr(props.curCasesStr)
    }, [props.curCasesStr])
    let {onSave, onReset} = props;

    return <div>
        <strong>{t('addOrEditRunCases')}</strong>
        <hr/>
        <Textarea value={str} onChange={(v) => {
            setStr(v)
        }
        }>{str}</Textarea>
        <hr/>
        <button className={'btn btn-sm btn-primary'} onClick={() => {
            onSave && onSave(str)
        }}><Check></Check>
            {t('save')}
        </button>
        <button className={'btn btn-sm btn-light'} onClick={() => {
            onSave && onSave('')
        }}>{t('resetToDefault')}
        </button>
    </div>
}


function HintsContent(props) {
    let [hintInd, setHintInd] = useState(0);
    let {hints = []} = props;
    hints = hints || []

    return <div>Подсказка ({hintInd + 1} из {hints.length})

        <hr/>
        {(hints[hintInd] || {}).desc}
        {hints.length > 1 && <>
            <hr/>
            <button
                className={'btn btn-sm btn-light'}
                onClick={() => setHintInd((hintInd + 1) % hints.length)}>Следующая
            </button>
            <button
                className={'btn btn-sm btn-light'}
                onClick={() => setHintInd((hints.length + hintInd - 1) % hints.length)}>Предыдущая
            </button>
        </>}

    </div>
}


function tryCatchWrap(code) {
    return `try {
    ${code}
} catch(e) {
   //console.log(e.toString());
}`
}

const IframeToRunLocal = React.memo((props) => {
    // Your component logic here
    return <IframeToRunLocal2 {...props}></IframeToRunLocal2>
}, (prevProps, nextProps) => {
    // Compare only the 'ind' prop
    return prevProps.forceRenderLogs === nextProps.forceRenderLogs;
});


function IframeToRunLocal2(props) {
    let {code, data, isNewExam, activeCaseInd, forceRenderLogs, question, cases, jsDetails} = props;
    let {codeType, fnName, fields} = jsDetails || {};
    let [cd, setCd] = useState(new Date().getTime());
    let [isSecond, setSecond] = useState(false);
    let isFirst = useRef(null)

    useEffect(() => {
        // setTimeout(() => {
        //     setSecond(true)
        // }, )
        isFirst.current = true;


        const updateTheme = () => {
            setCd(new Date().getTime())
        };

        const observer = new MutationObserver(updateTheme);
        observer.observe(document.documentElement, {
            attributes: true, // Watch for attribute changes
            attributeFilter: ['data-bs-theme'] // Only watch the 'data-theme' attribute
        });

        return () => observer.disconnect();

    }, [forceRenderLogs, activeCaseInd])
    let renderTime = ++renderCount;


    let bsTheme = ColorTheme.getTheme()
    let url = global.env.domain
        + "/" + (isFirst.current ? 'files' : 'init')
        + "/" + user.get_id() + "/" + question._id + "/index.html?cd=" + new Date().getTime() + '&darkMode=' + bsTheme

    if (isNewExam) {
        let examId = CustomStorage.getId();
        url = global.env.domain
            + "/" + (isFirst.current ? 'admin_files' : 'admin_init')
            + "/" + examId + "/" + question._id + "/index.html?cd=" + new Date().getTime() + '&darkMode=' + bsTheme

    }
    return <div className='logsRunWraps'>
        {/*<a href={url} target={"_blank"} className="pull-right" style={{marginRight: '5px'}}>*/}
        {/*    <i className="fa fa-external-link" aria-hidden="true"></i>*/}
        {/*</a>*/}
        <a className={'btn btn-light btn-sm pull-right'}
           style={{marginLeft: '10px', position: 'absolute', right: 0}}
           onClick={() => {
               setCd(new Date().getTime())
           }}><small>{t('reloadLogs')} [ctl^s]</small>
        </a>
        <iframe style={{width: '100%', background: 'white'}} src={url}></iframe>
    </div>
}


function RunResults(props) {
    function pubResults(r) {
        r = r || {};
        let data = r.ms == '0s' ? r.value : r;
        //console.log("qqqqq rrrrrr", r);
        return JSON.stringify(data, null, 4)
    }


    let {runResults} = props || {};

    //console.log("qqqqq run Results", runResults);
    let {firstError, totalCount, passCount, wrongCount, logResponse} = runResults || {};
    totalCount = totalCount || (logResponse ? 1 : 0);
    let firstErrorMsg = (firstError || {}).errMsg || ''
    return !totalCount ? <div>{t('notStartedTests')}</div> : <div>
        <div>{t('testPasses')} {passCount} {t('from')} {totalCount}</div>
        {logResponse && <div><small>{t('logsResponseMsg')}:</small>{(logResponse || []).map((it, ind) => {
            return (<pre key={ind}>
                {JSON.stringify(it)}
            </pre>)
        })}

        </div>}

        {/*Успешных кейсов {totalCount - wrongCount} из {totalCount}*/}
        {firstErrorMsg && <div>{t('programErrMsg')}: <div>{firstErrorMsg}</div></div>}
        {!firstErrorMsg && firstError && <div>
            <div>{t('errorInTestCase')} #{firstError.ind + 1}

                <div className="row np">
                    {(props.fields || []).map((field, ind) => {
                        return (<div className="col-sm-6" key={ind}>
                            <small>{field.name}:</small>
                            <pre>{JSON.stringify(firstError.params[ind], null)}</pre>

                        </div>)
                    })}
                </div>
                <div className="row np">
                    <div className="col-sm-12 ">
                        <div className="card0 card-body">
                            <small>{t('currentResult')}: </small>
                            <pre>{pubResults(firstError.res1)}</pre>
                        </div>
                    </div>
                    <div className="col-sm-12 ">
                        <div className="card0 card-body">
                            <small>{t('expectResult')}: </small>
                            <pre>{pubResults(firstError.res2)}</pre>
                        </div>

                    </div>
                </div>
            </div>

        </div>}

        {!wrongCount && totalCount && <div>{t('congratMsg')}</div>}

    </div>
}


function getCode() {
    let str = `
console.log('1');

setTimeout(() => {
 //console.log('2');
  Promise.resolve().then(() => console.log('3')).then(() => console.log('4'));
}, 0);

console.log('11');

new Promise((resolve, reject) => {

  setTimeout(() => {
   //console.log('8')
  });
  
  Promise.resolve().then(() => console.log('10'))
  
 //console.log('9');
});

setTimeout(() => {
 //console.log('13');
}, 100);

console.log('12');

setTimeout(() => {
 //console.log('5');
}, 0);

Promise.resolve().then(() => console.log('6')).then(() => console.log('7'));

console.log('8');`;

    let nums = _.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);

    let repl = str.replace(/[0-9]+/gi, (...args) => {
        let v = +args[0];
        return v == 0 || v > 99 ? v : nums[v - 1]
    });


    // return '<p><span style="color: rgb(230, 0, 0); background-color: rgb(255, 255, 0);">asdfdasdf</span></p><p><br></p><p><br></p><p><span style="color: rgb(230, 0, 0); background-color: rgb(255, 255, 0);">asdfa</span></p><p>asdfasdfd</p><p><br></p><pre class="ql-syntax" spellcheck="false">var code = `asdfasdfa`\n' +
    //   '</pre>'
    return repl;
}


export default CodeRunComponent
