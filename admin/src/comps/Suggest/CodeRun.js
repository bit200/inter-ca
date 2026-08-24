import React, {useEffect, useRef, useState} from 'react';
import _ from 'underscore';
import MDEditor from "@uiw/react-md-editor";
import MyModal from 'libs/MyModal';
import QuestionDetails from "./QuestionDetails";
import Textarea from 'libs/Textarea';
import user from 'libs/user/user'
import QuestionCorrectSolution from "./QuestionCorrectSolution";
import CustomStorage from "./CustomStorage";
import LazyEditor from "../LazyEditor/LazyEditor";
import Check from "../StarRating";
import ColorTheme from "../ColorTheme";
import {useCodeRun} from './useCodeRun';

let renderCount = 1;
let dragInit = {}

function CodeRunComponent(props) {
    let {
        code, logsReader, forceRenderLogs, setForceRenderLogs,
        history, files, selectedFileInd, setSelectedFileInd,
        runLoading, curCasesStr, setCurCasesStr,
        cases, setCases, jsDetails,
        topTab, setTopTab,
        runResults, runSubmitResults,
        activeCaseInd, setActiveCaseInd,
        data,
        question, caseItem, firstErrorInd, isLogsReader,
        run, submit, buildTestCases,
        onChangeCodeLocal, onChangeLogsLocal,
        getFileName, getStarter, getFileExt, updateCode,
        startTime,
    } = useCodeRun(props);

    let [validateErrors, setValidateErrors] = useState([]);
    let [hintInd, setHintInd] = useState(-1);
    let [dragOpts, setDragOpts] = useState({});

    const parentTopRef = useRef(null);
    const parentRightRef = useRef(null);
    const topRef = useRef(null);
    const botRef = useRef(null);
    const rightRef = useRef(null);
    const leftRef = useRef(null);

    let hintModal;
    let solutionModal;
    let directCodeSolutionModal;
    let casesModal;

    useEffect(() => {
        window.listenCtrlS = () => {
            setTopTab('logs');
            setForceRenderLogs(new Date().getTime());
        };
        topRef.current.style.height = Storage.get('codeResizeTop') || '70%';
        rightRef.current.style.width = Storage.get('codeResizeLeft') || '50%';
        setBotRef();
        setLeftRef();
    }, []);

    function setBotRef() {
        let perc = 100 - parseFloat(topRef.current.style.height);
        botRef.current.style.height = perc + '%';
    }

    function setLeftRef() {
        let perc = 100 - parseFloat(rightRef.current.style.width);
        leftRef.current.style.width = perc + '%';
    }

    function getHeight(el) { return el.clientHeight; }
    function getWidth(el) { return el.clientWidth; }

    let isNewExam = props.isNewExam;

    return <div
        className={'codeRunWrap ' + (dragOpts.drag1 || dragOpts.drag2 ? 'dragging' + (dragOpts.drag1 ? '1' : 2) : '')}
        ref={parentRightRef}
        onMouseDown={(e) => {
            let dragKey = e.target.getAttribute('id');
            try {
                let totalX = getWidth(parentRightRef.current)
                let totalY = getHeight(parentTopRef.current)
                let percX = +rightRef.current.style.width.replace('%', '')
                let percY = +topRef.current.style.height.replace('%', '')
                dragInit = {
                    percY, percX, totalX, totalY,
                    dx: (100 - percX) * totalX / 100 - e?.clientX || 0,
                    dy: (percY) * totalY / 100 - e?.clientY || 0,
                }
            } catch (e) {}
            (/drag1|drag2/gi.test(dragKey)) && setDragOpts({[dragKey]: true})
        }}
        onMouseUp={() => {
            let {drag1, drag2} = dragOpts || {};
            if (drag1 || drag2) setDragOpts({});
        }}
        onMouseMove={(e) => {
            let {drag1, drag2} = dragOpts;
            if (!drag1 && !drag2) return;
            if (drag1) {
                let MIN_MAX = 20;
                let y = e.clientY + dragInit.dy;
                let total = dragInit.totalY || getHeight(parentTopRef.current)
                let perc = Math.min(100 - MIN_MAX, Math.max(MIN_MAX, Math.round(100 * (y / total)))) + '%';
                topRef.current.style.height = perc;
                setBotRef();
                Storage.set('codeResizeTop', perc);
            } else if (drag2) {
                let MIN_MAX = 20;
                let x = e.clientX + dragInit.dx;
                let total = dragInit.totalX || getWidth(parentRightRef.current)
                let perc = Math.min(100 - MIN_MAX, Math.max(MIN_MAX, 100 - Math.round(100 * (x / total)))) + '%';
                rightRef.current.style.width = perc;
                setLeftRef();
                Storage.set('codeResizeLeft', perc);
            }
        }}
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
                                                    onClick={() => { setHintInd(0); hintModal.show(); }}>
                                                <i className="iconoir-developer"></i>
                                            </button>}
                                        <button title={t('explainMsg')} className={'btn btn-sm btn-light'}
                                                onClick={() => solutionModal.show()}>
                                            <span className="iconoir-multiple-pages"></span>
                                        </button>
                                        <button title={t('solutionMsg')} className={'btn btn-sm btn-light'}
                                                onClick={() => directCodeSolutionModal.show()}>
                                            <span className="iconoir-settings-profiles"></span>
                                        </button>
                                    </>}
                                    <div className={'ib ' + (jsDetails.hideRunStatus == 'hidden' ? 'hiddenBlock' : '')}>
                                        <button className={'btn btn-sm btn-light'} disabled={runLoading}
                                                onClick={() => run()}>
                                            <i className="iconoir-terminal"></i>
                                            {t('runMsg')}
                                        </button>
                                        {!props.isNewExam &&
                                            <button className={'btn btn-sm btn-primary'} onClick={() => submit()}>
                                                <i className="iconoir-arcade"></i>
                                                {t('submitMsg')}
                                            </button>}
                                    </div>

                                    <MyModal size={'md'} ref={(el) => solutionModal = el}>
                                        <QuestionDetails withoutShow={true} question={question}></QuestionDetails>
                                    </MyModal>
                                    <MyModal size={'md'} ref={(el) => directCodeSolutionModal = el}>
                                        <div style={{height: '500px'}}>
                                            <QuestionCorrectSolution details={jsDetails} start={startTime} total={300}/>
                                        </div>
                                    </MyModal>
                                    <MyModal size={'small'} ref={(el) => hintModal = el}>
                                        <HintsContent hints={question.hints}/>
                                    </MyModal>
                                </div>
                            </div>
                            <div className="code-run-tab-wrap">
                                {[
                                    {name: 'conditionMsg', type: 'condition'},
                                    {name: 'results', type: 'results'},
                                    !isLogsReader ? {name: 'logs', type: 'logs'} : null,
                                ].map((it, ind) => {
                                    if (!it) return <React.Fragment key={ind}/>
                                    return (
                                        <a key={ind}
                                           className={'code-run-tab ' + (it.type == topTab ? 'active' : '')}
                                           style={{marginRight: '5px'}}
                                           onClick={() => setTopTab(it.type)}>
                                            {t(it.name)}
                                        </a>
                                    )
                                })}
                            </div>
                        </div>

                        {topTab === 'logs' && !isLogsReader && <>
                            <IframeToRunLocal
                                isNewExam={isNewExam}
                                cases={cases}
                                activeCaseInd={activeCaseInd}
                                code={code}
                                jsDetails={jsDetails}
                                question={question}
                                forceRenderLogs={forceRenderLogs}
                            />
                        </>}
                        {topTab === 'condition' &&
                            <div className={'conditionWrap'}>
                                <MDEditor.Markdown data-color-mode="light" source={question.name}/>
                                {isLogsReader && <>
                                    <hr/>
                                    Поле для ввода логов
                                    <LazyEditor
                                        height="300px"
                                        defaultLanguage="javascript"
                                        defaultValue="[]"
                                        options={{minimap: {enabled: false}}}
                                        value={logsReader}
                                        onChange={(v) => onChangeLogsLocal(v)}
                                    />
                                </>}
                            </div>}
                        {topTab === 'results' && <div className={'card3 ' + (runLoading ? 'o5' : '')}>
                            <div style={{padding: '5px'}} className={'animChild'}>
                                <small>&nbsp;</small>
                                <h5>{t('runResults')}</h5>
                                <RunResults runResults={runResults} fields={data.fields}/>
                                {!isNewExam && <>
                                    <hr/>
                                    <h5>{t('runResultsSubmit')}</h5>
                                    <RunResults runResults={runSubmitResults} fields={data.fields}/>
                                </>}
                            </div>
                        </div>}
                    </div>
                    <div className="resizeH" id={'drag1'}></div>
                </div>
                <div className="crBot" ref={botRef}>
                    <div className={"vertChild casesChild " + (isLogsReader ? 'logsRader' : '')}>
                        {!isLogsReader && <>
                            <div className="cases-wrap">
                                {(cases || []).map((caseItem, ind) => (
                                    <div key={ind}
                                         status={(firstErrorInd == -1 ? '' : (firstErrorInd > ind) ? 'ok' : firstErrorInd === ind ? 'error' : '')}
                                         className={'btn btn-xs btn-default case-title ib ' + (activeCaseInd == ind ? 'active-case' : '')}
                                         onClick={() => setActiveCaseInd(ind)}>
                                        <div>
                                            <span className={'run-circle'}></span> {t('case')} #{ind + 1}
                                        </div>
                                    </div>
                                ))}
                                <div className="ib btn btn-xs btn-default case-title"
                                     title={t('editCases')}
                                     onClick={() => casesModal.show()}>
                                    <i className="iconoir-edit"></i>
                                </div>
                                <MyModal ref={(el) => casesModal = el}>
                                    <EditCasesModal
                                        curCasesStr={curCasesStr}
                                        onSave={(v) => {
                                            let original = (jsDetails || {}).pubCasesStr;
                                            let isReset = !v || (v === original);
                                            v = v || original;
                                            setCurCasesStr(v);
                                            props.onChangeCurStr && props.onChangeCurStr(v);
                                            setCases(buildTestCases(v, jsDetails.fields));
                                            casesModal.hide();
                                            if (props.isExam) {
                                                props.onChangeCurStr && props.onChangeCurStr(v, isReset);
                                            } else {
                                                global.http.post('/update-test-case', {
                                                    questionId: question._id,
                                                    value: v,
                                                    isReset
                                                }).then();
                                            }
                                        }}
                                    />
                                </MyModal>
                            </div>
                            {caseItem && (jsDetails.fields || []).map((it, ind) => (
                                <div key={ind}>
                                    {it.name} = {JSON.stringify(caseItem[ind])}
                                </div>
                            ))}
                        </>}
                        {isLogsReader && <>{t('noCases')}</>}
                        <hr/>
                        {(validateErrors || []).map((error, ind) => (
                            <div key={ind} style={{fontSize: '12px'}}>
                                Line: [{error.startLineNumber}] {error.message}
                                <hr/>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="resizeV" id={'drag2'}></div>
        </div>
        <div className="crRight" ref={rightRef}>
            <div className="filesWrap">
                <div className="btn-reset">
                    <button className={'btn btn-xs btn-light'} onClick={() => {
                        onConfirm({name: t('areYouSure')}, () => {
                            onChangeCodeLocal(getStarter(jsDetails))
                        })
                    }}>
                        {t('resetCode')}
                    </button>
                </div>
                {files && files.length > 1 && files.map((it, ind) => (
                    <div key={ind}
                         onClick={() => {
                             let _code = ((history || {}).files || {})[it.name] || getStarter(jsDetails, ind);
                             setSelectedFileInd(ind);
                             updateCode(_code);
                         }}
                         className={'ib filesItem ' + (ind === selectedFileInd ? 'selectedFile' : '')}>
                        {it.name || '-'}
                    </div>
                ))}
            </div>
            {jsDetails._id}
            <SmartCodeEditor
                getFileExt={getFileExt}
                isLogsReader={isLogsReader}
                code={code}
                setValidateErrors={setValidateErrors}
                onChangeCodeLocal={onChangeCodeLocal}
            />
        </div>
    </div>
}


function SmartCodeEditor({getFileExt, code, setValidateErrors, onChangeCodeLocal, isLogsReader}) {
    const editorRef = useRef(null);
    const isExternalChange = useRef(false);

    useEffect(() => {
        if (editorRef.current && editorRef.current.getValue() !== code) {
            isExternalChange.current = true;
            editorRef.current.setValue(code);
            isExternalChange.current = false;
        }
    }, [code]);

    return <LazyEditor
        height="calc(100% - 12px)"
        defaultLanguage={getFileExt()}
        language={getFileExt()}
        defaultValue={code}
        options={{readOnly: isLogsReader, minimap: {enabled: false}}}
        onMount={(editor) => { editorRef.current = editor; }}
        onValidate={(e) => setValidateErrors(e)}
        onChange={(v) => {
            if (isExternalChange.current) return;
            if (v != code) onChangeCodeLocal(v);
        }}
    />
}


function EditCasesModal(props) {
    let [str, setStr] = useState('');
    useEffect(() => { setStr(props.curCasesStr); }, [props.curCasesStr]);
    let {onSave} = props;

    return <div>
        <strong>{t('addOrEditRunCases')}</strong>
        <hr/>
        <Textarea value={str} onChange={(v) => setStr(v)}>{str}</Textarea>
        <hr/>
        <button className={'btn btn-sm btn-primary'} onClick={() => onSave && onSave(str)}>
            <Check/>{t('save')}
        </button>
        <button className={'btn btn-sm btn-light'} onClick={() => onSave && onSave('')}>
            {t('resetToDefault')}
        </button>
    </div>
}


function HintsContent(props) {
    let [hintInd, setHintInd] = useState(0);
    let {hints = []} = props;
    hints = hints || [];

    return <div>
        Подсказка ({hintInd + 1} из {hints.length})
        <hr/>
        {(hints[hintInd] || {}).desc}
        {hints.length > 1 && <>
            <hr/>
            <button className={'btn btn-sm btn-light'}
                    onClick={() => setHintInd((hintInd + 1) % hints.length)}>Следующая</button>
            <button className={'btn btn-sm btn-light'}
                    onClick={() => setHintInd((hints.length + hintInd - 1) % hints.length)}>Предыдущая</button>
        </>}
    </div>
}


const IframeToRunLocal = React.memo((props) => {
    return <IframeToRunLocal2 {...props}/>;
}, (prevProps, nextProps) => prevProps.forceRenderLogs === nextProps.forceRenderLogs);


function IframeToRunLocal2(props) {
    let {isNewExam, activeCaseInd, forceRenderLogs, question} = props;
    let [cd, setCd] = useState(new Date().getTime());
    let isFirst = useRef(null);

    useEffect(() => {
        isFirst.current = true;
        const updateTheme = () => setCd(new Date().getTime());
        const observer = new MutationObserver(updateTheme);
        observer.observe(document.documentElement, {attributes: true, attributeFilter: ['data-bs-theme']});
        return () => observer.disconnect();
    }, [forceRenderLogs, activeCaseInd]);

    let bsTheme = ColorTheme.getTheme();
    let url = isNewExam
        ? global.env.domain + '/' + (isFirst.current ? 'admin_files' : 'admin_init') + '/' + CustomStorage.getId() + '/' + question._id + '/index.html?cd=' + cd + '&darkMode=' + bsTheme
        : global.env.domain + '/' + (isFirst.current ? 'files' : 'init') + '/' + user.get_id() + '/' + question._id + '/index.html?cd=' + cd + '&darkMode=' + bsTheme;

    return <div className='logsRunWraps'>
        <a className={'btn btn-light btn-sm pull-right'}
           style={{marginLeft: '10px', position: 'absolute', right: 0}}
           onClick={() => setCd(new Date().getTime())}>
            <small>{t('reloadLogs')} [ctl^s]</small>
        </a>
        <iframe style={{width: '100%', background: 'white'}} src={url}/>
    </div>
}


function RunResults(props) {
    function pubResults(r) {
        r = r || {};
        let data = r.ms == '0s' ? r.value ?? r.errMsg : r;
        return JSON.stringify(data, null, 4);
    }

    let {runResults} = props || {};
    let {firstError, totalCount, passCount, wrongCount, logResponse} = runResults || {};
    totalCount = totalCount || (logResponse ? 1 : 0);
    let firstErrorMsg = (firstError || {}).errMsg || '';

    return !totalCount ? <div>{t('notStartedTests')}</div> : <div>
        <div>{t('testPasses')} {passCount} {t('from')} {totalCount}</div>
        {logResponse && <div>
            <small>{t('logsResponseMsg')}:</small>
            {(logResponse || []).map((it, ind) => <pre key={ind}>{JSON.stringify(it)}</pre>)}
        </div>}
        {firstErrorMsg && <div>{t('programErrMsg')}: <div>{firstErrorMsg}</div></div>}
        {!firstErrorMsg && firstError && <div>
            <div>{t('errorInTestCase')} #{firstError.ind + 1}
                <div className="row np">
                    {(props.fields || []).map((field, ind) => (
                        <div className="col-sm-6" key={ind}>
                            <small>{field.name}:</small>
                            <pre>{JSON.stringify(firstError.params[ind], null)}</pre>
                        </div>
                    ))}
                </div>
                <div className="row np">
                    <div className="col-sm-12">
                        <div className="card0 card-body">
                            <small>{t('currentResult')}: </small>
                            <pre>{pubResults(firstError.res1)}</pre>
                        </div>
                    </div>
                    <div className="col-sm-12">
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


export default CodeRunComponent
