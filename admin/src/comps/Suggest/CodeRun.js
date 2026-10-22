import React, {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
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
import {CheckErrorNotice, isCheckError} from './CheckErrorNotice';
import VsTaskRun from "../VsTask/VsTaskRun";
import {isVsTask} from "../VsTask/vsTask";
import {CodeReviewBlock} from "./CodeReviewBlock";
import {CodeFilesTree, CodeTaskResults, getCodeTaskContent, isCodeTaskDetails} from './CodeTaskResults';
import {isSqlDetails, SqlRunResults, SqlSchemaPanel} from "./SqlRunResults";

let renderCount = 1;
let dragInit = {}

function CodeRunComponent(props) {
    let {
        code, logsReader, forceRenderLogs, setForceRenderLogs,
        history, files, selectedFileInd, setSelectedFileInd,
        runLoading, curCasesStr, setCurCasesStr,
        cases, setCases, jsDetails,
        topTab, setTopTab,
        runResults, runSubmitResults, submissionId,
        activeCaseInd, setActiveCaseInd,
        data,
        question, caseItem, firstErrorInd, isLogsReader,
        run, submit, buildTestCases,
        onChangeCodeLocal, onChangeLogsLocal,
        getFileName, getStarter, getFileExt, updateCode, isReadOnlyFile,
        startTime,
    } = useCodeRun(props);

    let [validateErrors, setValidateErrors] = useState([]);
    let [hintInd, setHintInd] = useState(-1);
    let [dragOpts, setDragOpts] = useState({});
    // SQL-задание: вкладка logs (iframe с JS-песочницей) и тест-кейсы по полям не нужны.
    let isSql = isSqlDetails(jsDetails);
    // codeType 'code': дерево файлов, тесты списком, без iframe-превью и тест-кейсов по полям.
    let isCode = isCodeTaskDetails(jsDetails);
    // codeType 'code' + lang 'react': превью из esbuild-бандла api (без unpkg/Babel).
    let hasPreview = isCode && isReactPreview(jsDetails);

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
            if (isSqlDetails(props.jsDetails)) return;
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

    // Колонка дерева файлов code-задачи: ширина в px, тянется за ручку между деревом и редактором.
    let [treeWidth, setTreeWidth] = useState(() => {
        let w = +Storage.get('codeTreeWidth');
        return w >= 120 ? w : 200;
    });

    // Развернуть блок «дерево + редактор» поверх страницы; Esc сворачивает обратно.
    let [codeFull, setCodeFull] = useState(false);
    useEffect(() => {
        if (!codeFull) return;
        let onKey = (ev) => { if (ev.key === 'Escape') setCodeFull(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [codeFull]);

    function startTreeResize(e) {
        e.preventDefault();
        e.stopPropagation();
        let startX = e.clientX, startW = treeWidth, last = startW;
        let move = (ev) => {
            last = Math.min(500, Math.max(120, startW + ev.clientX - startX));
            setTreeWidth(last);
        };
        let up = () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
            Storage.set('codeTreeWidth', last);
        };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
    }

    function getHeight(el) { return el.clientHeight; }
    function getWidth(el) { return el.clientWidth; }

    let isNewExam = props.isNewExam;

    // В модалке предок с transform/overflow превращает position:fixed в «fixed внутри модалки»,
    // поэтому в полноэкранном режиме блок выносится порталом в body.
    let wrap = (isCode && codeFull) ? (el) => createPortal(el, document.body) : (el) => el;
    return wrap(<div
        className={'codeRunWrap ' + (isCode && codeFull ? 'codeRunFull ' : '') + (dragOpts.drag1 || dragOpts.drag2 ? 'dragging' + (dragOpts.drag1 ? '1' : 2) : '')}
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
                                    {!props.isNewExam && !props.woSolution && <>
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
                                                data-testid={'code-run-run'}
                                                onClick={() => run()}>
                                            <i className="iconoir-terminal"></i>
                                            {t('runMsg')}
                                        </button>
                                        {!props.isNewExam &&
                                            <button className={'btn btn-sm btn-primary'} data-testid={'code-run-submit'} onClick={() => submit()}>
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
                                    !isLogsReader && !isSql && !isCode ? {name: 'logs', type: 'logs'} : null,
                                    hasPreview ? {name: 'previewTab', type: 'preview'} : null,
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

                        {topTab === 'logs' && !isLogsReader && !isSql && !isCode && <>
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
                        {topTab === 'preview' && hasPreview &&
                            <ReactPreview isNewExam={isNewExam} question={question} examId={props.examId}
                                          reloadKey={runResults}/>}
                        {topTab === 'condition' &&
                            <div className={'conditionWrap'}>
                                <MDEditor.Markdown data-color-mode="light" source={question.name}/>
                                {isCode && question.title && question.title !== question.name &&
                                    <div data-testid={'code-condition-text'}>
                                        <MDEditor.Markdown data-color-mode="light" source={question.title}/>
                                    </div>}
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
                                <div data-testid={'code-run-results'} data-kind={'run'}>
                                    <RunResults runResults={runResults} fields={data.fields} isSql={isSql} isCode={isCode}/>
                                </div>
                                {!isNewExam && <>
                                    <hr/>
                                    <h5>{t('runResultsSubmit')}</h5>
                                    <div data-testid={'code-run-results'} data-kind={'submit'}>
                                        <RunResults runResults={runSubmitResults} fields={data.fields} isSql={isSql} isCode={isCode}/>
                                    </div>
                                    <CodeReviewBlock submissionId={submissionId} hidden={!!props.courseCheck}
                                                     isExam={!!props.isExam && !props.courseCheck}/>
                                </>}
                            </div>
                        </div>}
                    </div>
                    <div className="resizeH" id={'drag1'}></div>
                </div>
                <div className="crBot" ref={botRef}>
                    <div className={"vertChild casesChild " + (isLogsReader ? 'logsRader' : '')}>
                        {isSql && <SqlSchemaPanel jsDetails={jsDetails}/>}
                        {!isLogsReader && !isSql && !isCode && <>
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
        <div className={'crRight' + (isCode ? ' crRightTree' : '')} ref={rightRef}>
            <div className={isCode ? 'codeSplit' : 'codeSplitFlat'}>
                {isCode && <>
                    <div className="codeTreeCol" style={{width: treeWidth}} data-testid="code-tree-col">
                        <CodeFilesTree files={files} selectedInd={selectedFileInd} onSelect={(ind) => {
                            setSelectedFileInd(ind);
                            updateCode(getCodeTaskContent(jsDetails, history, (files[ind] || {}).name));
                        }}/>
                    </div>
                    <div className="codeTreeResize" data-testid="code-tree-resize" onMouseDown={startTreeResize}></div>
                </>}
                <div className={isCode ? 'codeEditorCol' : 'codeEditorFlat'}>
                    <div className="filesWrap">
                        {isCode && <button className={'btn btn-xs btn-light codeFullBtn'}
                                data-testid="code-full-btn"
                                title={codeFull ? 'Свернуть' : 'На весь экран'}
                                onClick={() => setCodeFull(!codeFull)}>
                            <i className={codeFull ? 'iconoir-collapse' : 'iconoir-expand'}></i>
                        </button>}
                        <div className="btn-reset">
                            <button className={'btn btn-xs btn-light'} onClick={() => {
                                onConfirm({name: t('areYouSure')}, () => {
                                    onChangeCodeLocal(getStarter(jsDetails, selectedFileInd))
                                })
                            }}>
                                {t('resetCode')}
                            </button>
                        </div>
                        {!isCode && files && files.length > 1 && files.map((it, ind) => (
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
                        isLogsReader={isLogsReader || isReadOnlyFile()}
                        code={code}
                        setValidateErrors={setValidateErrors}
                        onChangeCodeLocal={onChangeCodeLocal}
                    />
                </div>
            </div>
        </div>
    </div>)
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


export function isReactPreview(details) {
    return (details || {}).codeType === 'code' && (details || {}).lang === 'react';
}

// iframe не шлёт Authorization: превью api отдаёт по ?token= (+cookie).
export function buildPreviewUrl({isNewExam, examId, userId, questionId, token, cd}) {
    let query = '?cd=' + cd + '&token=' + encodeURIComponent(token || '');
    return isNewExam
        ? global.env.domain + '/admin_preview/' + examId + '/' + questionId + query
        : global.env.domain + '/preview/' + userId + '/' + questionId + query;
}

// Обновляется по кнопке и после запуска/сдачи (reloadKey). Ошибку сборки api отдаёт HTML-страницей (422) — iframe её покажет.
export function ReactPreview({isNewExam, question, examId, reloadKey}) {
    let [cd, setCd] = useState(new Date().getTime());
    useEffect(() => { setCd(new Date().getTime()); }, [reloadKey]);
    let url = buildPreviewUrl({
        isNewExam, examId: examId || CustomStorage.getId(), userId: user.get_id(),
        questionId: question._id, token: user.get_token && user.get_token(), cd,
    });
    return <div className='logsRunWraps' data-testid={'react-preview'}>
        <a className={'btn btn-light btn-sm pull-right'}
           style={{marginLeft: '10px', position: 'absolute', right: 0}}
           data-testid={'react-preview-reload'}
           onClick={() => setCd(new Date().getTime())}>
            <small>{t('reloadPreview')}</small>
        </a>
        <iframe title={'preview'} style={{width: '100%', background: 'white'}} src={url}/>
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
    // iframe не шлёт заголовок Authorization: файлы задачи API отдаёт только по ?token=.
    let query = '/index.html?cd=' + cd + '&darkMode=' + bsTheme + '&token=' + encodeURIComponent(user.get_token() || '');
    let url = isNewExam
        ? global.env.domain + '/' + (isFirst.current ? 'admin_files' : 'admin_init') + '/' + CustomStorage.getId() + '/' + question._id + query
        : global.env.domain + '/' + (isFirst.current ? 'files' : 'init') + '/' + user.get_id() + '/' + question._id + query;

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
    if (isCheckError(props.runResults)) return <CheckErrorNotice/>;
    if (props.isCode || (props.runResults || {}).tests) {
        return <CodeTaskResults runResults={props.runResults}/>
    }
    if (props.isSql || (props.runResults || {}).sqlResults) {
        return <SqlRunResults runResults={props.runResults}/>
    }

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


// VS Code-задачи (в т.ч. SQL) решаются не в Monaco + /run-question, а в редакторе
// на docker-m — развилка здесь, чтобы экзамен и тренировка шли через один вход.
function CodeRun(props) {
    if (isVsTask(props.question)) {
        return <VsTaskRun task={props.question} examId={props.examId} hist={props.vsHist}/>
    }
    return <CodeRunComponent {...props}/>
}

export default CodeRun
