import {useEffect, useRef, useState} from 'react';

export function useCodeRun(props) {
    let {isExam, onChangeCode, onChangeLogs} = props;

    let [code, setCode] = useState('');
    let [logsReader, setLogsReader] = useState('[]');
    let [forceRenderLogs, setForceRenderLogs] = useState(-1);
    let [history, setHistory] = useState(-1);
    let [files, setFiles] = useState([]);
    let [selectedFileInd, setSelectedFileInd] = useState(0);
    let [runLoading, setRunLoading] = useState(false);
    let [curCasesStr, setCurCasesStr] = useState('');
    let [cases, setCases] = useState([]);
    let [jsDetails, setJsDetails] = useState({});
    let [topTab, setTopTab] = useState('condition');
    let [runResults, setRunResults] = useState({});
    let [runSubmitResults, setRunSubmitResults] = useState({});
    let [activeCaseInd, setActiveCaseInd] = useState(0);
    let [data, setData] = useState({});
    const codeRef = useRef('');
    const startTimeRef = useRef(0);

    let question = props.question || (data || {}).question || {};


    console.log('LOOOG question', question);

    global.setHistoryObj = (histObj) => {
        setData(d => ({...d, historyObj: histObj[getQuestionId()]}));
    };

    useEffect(() => {
        startTimeRef.current = new Date().getTime();
    }, []);

    useEffect(() => {
        initExam();
    }, [(props.question || {})._id]);

    function getQuestionId() {
        return window.location.href.split('=')[1] || 1061;
    }

    function getFileName(ind = selectedFileInd, _files) {
        ind = ind || 0;
        return ((_files || files || [])[ind] || {}).name || '';
    }

    function getStarter(_jsDetails, ind = 0, fname) {
        let fileName = fname || getFileName(ind);
        return ((_jsDetails.starterFiles || {})[fileName] || '') || (_jsDetails.starter || '') || '';
    }

    function isLogsRaederFn(_jsDetails) {
        return (_jsDetails || {}).codeType === 'logreader';
    }

    function getFileExt() {
        let name = getFileName(selectedFileInd);
        let arr = (name || '').split('.');
        let last = arr[arr.length - 1];
        return last === 'css' ? 'css' : last === 'html' ? 'html' : last === 'ts' ? 'typescript' : 'javascript';
    }

    function updateCode(newCode) {
        codeRef.current = newCode;
        setCode(newCode);
    }

    function buildTestCases(str, fields) {
        let size = (fields || []).length;
        if (!size) return [];
        let res = [];
        let arr = (str || '').split('\n');
        try {
            for (let i = 0; i < arr.length; i += fields.length) {
                let d = [];
                for (let j = 0; j < size; j++) {
                    let it;
                    try { it = JSON.parse(arr[i + j]); } catch (e) { it = arr[i + j]; }
                    d.push(it);
                }
                res.push(d);
            }
        } catch (e) {}
        return res;
    }

    function getTestCase() {
        return (cases || [])[activeCaseInd || 0] || '';
    }

    function initExam() {
        let {jsDetails: _jsDetails = {}, history: _history = {}, runResults: _runResults} = props;
        _history ??= {};
        _history.files ??= {};

        let str = _history.testCasesStr || _jsDetails.curCasesStr || _jsDetails.pubCasesStr || '';
        let builtCases = buildTestCases(str, _jsDetails.fields);
        let fileName = getFileName(0, _jsDetails.files);
        let __code = !isLogsRaederFn(_jsDetails)
            ? (_history.files || {})[fileName] || getStarter(_jsDetails, 0, fileName)
            : getStarter(_jsDetails, 0, fileName);

        updateCode(__code);
        setLogsReader(_history.logsReader || '[]');
        setCurCasesStr(str);
        setHistory(_history);
        setCases(builtCases);
        setJsDetails(_jsDetails);
        setRunResults(_runResults);
        setFiles(_jsDetails.files || []);
    }

    function run(params) {
        setTopTab('results');
        setRunLoading(true);
        global.http.post('/run-question', {
            curCasesStr,
            isExam,
            files: {'': codeRef.current},
            logsReader,
            question: question._id || getQuestionId(),
            ...params
        })
            .then(r => {
                setRunLoading(false);
                let {wrongCount} = r;

                function trySet(key, keys) {
                    let curStatus = (data.historyObj || {}).status;
                    if (keys.indexOf(curStatus) < 0) {
                        try { Storage.changeStatus({_id: getQuestionId(), status: key}); } catch (e) {}
                    }
                }

                if (params && params.isSubmit) {
                    !wrongCount && trySet('very_good', ['very_good']);
                    setRunSubmitResults(r);
                } else {
                    !wrongCount && trySet('norm', ['good', 'very_good']);
                    setRunResults(r);
                    props.onChangeRunResults && props.onChangeRunResults(r);
                    r.firstError && setActiveCaseInd(r.firstError.ind);
                }
            })
            .catch(e => {
                console.error(e);
                setRunLoading(false);
                const result = {
                    wrongCount: 1, passCount: 0, totalCount: 1,
                    firstError: {ind: 0, res1: {errMsg: e.message ?? e.msg ?? e.error?.message ?? e}, res2: {}},
                    info: {FOLDER: 'local'}
                };
                setRunResults(result);
                props?.onChangeRunResults?.(result);
                setActiveCaseInd(0);
            });
    }

    function submit() {
        run({isSubmit: true});
    }

    function onChangeCodeLocal(newCode) {
        let fileName = getFileName();
        history.files[fileName] = newCode;
        updateCode(newCode);
        setHistory(history);
        if (isExam) {
            onChangeCode && onChangeCode(newCode, fileName, getTestCase());
        }
    }

    function onChangeLogsLocal(logs) {
        setLogsReader(logs);
        onChangeLogs && onChangeLogs(logs);
    }

    let caseItem = (cases || [])[activeCaseInd];
    let firstErrorInd = !runResults ? -1 : runResults.firstError ? runResults.firstError.ind : 99999;
    let isLogsReader = isLogsRaederFn(jsDetails);

    return {
        // state
        code, logsReader, forceRenderLogs, setForceRenderLogs,
        history, files, selectedFileInd, setSelectedFileInd,
        runLoading, curCasesStr, setCurCasesStr,
        cases, setCases, jsDetails,
        topTab, setTopTab,
        runResults, runSubmitResults,
        activeCaseInd, setActiveCaseInd,
        data,
        // computed
        question, caseItem, firstErrorInd, isLogsReader,
        // actions
        run, submit, buildTestCases,
        onChangeCodeLocal, onChangeLogsLocal,
        getFileName, getStarter, getFileExt, updateCode,
        startTime: startTimeRef.current,
    };
}
