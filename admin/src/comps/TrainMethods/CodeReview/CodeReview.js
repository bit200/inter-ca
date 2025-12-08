import React, {useState, useEffect, useRef, forwardRef, useImperativeHandle} from 'react';
import MDEditorComp from "../../Suggest/MDEditorComp";
import MdPreview from "../../Suggest/MdPreview";
import CodeRun from "../../Suggest/CodeRun";
import LazyEditor from "../../LazyEditor/LazyEditor";
import AudioShort from "../AudioShort/AudioShort";
import Textarea from "../../../libs/Textarea";
import './CodeReview.css'


let _files = [], _plainValue = ''
let CodeReview = forwardRef((props, ref) => {
    let [activeFiles, setActiveFiles] = useState([]);
    let [files, setFiles] = useState([]);
    let [activeFileInd, setActiveFileInd] = useState(0);
    let [code, setCode] = useState('');
    let [plainValue, setPlainValue] = useState('plain Value test');
    let [hashInfo, setHashInfo] = useState({});
    let {onStart, item, opts = {}, title, startAnswer} = props;
    let activeEl = useRef();

    _files = files;
    _plainValue = plainValue;
    let {hist, isActive} = props;
    let activeFileName = ((files || [])[activeFileInd] || {}).name


    // useEffect(() => {
    //     loadFiles()
    // }, [startAnswer]);

    useEffect(() => {
        loadFiles()
    }, [props.activeInd]);

    function getCodeInformation() {
        return _files;
    }

    function getPlainValue() {
        return _plainValue;
    }

    function extendCompare(data) {
        let compare = compareResultsCodePreview(props.item, data)
        console.log("qqqqq compare3333", compare);
        // compareResults(, v.data)
        data.isCompare = compare.isCompare
        data.isCorrect = compare.isCorrect
        if (compare.isCompare) {
            data.compareRate = compare.isCorrect ? 5 : 1
        }
        data.copmareObj = compare;
    }


    function onChange(v) {
        v.data = v.data || {};
        v.data.files = getCodeInformation();
        v.data.plainValue = getPlainValue();
        v.data.audioRate = v.data.rate;

        extendCompare(v.data)
        v.data.rate = Math.min(v.data.audioRate, v.data.codeRate)

        props.onChange && props.onChange(v)

    }


    function onChangeCode(code, _activeFileInd = activeFileInd) {
        files[_activeFileInd] = files[_activeFileInd] || {};
        files[_activeFileInd].code = code;
        setFiles([...files]);
        let _data = {files, activeFile, activeFileInd: _activeFileInd, code};
        opts.debugCompareRateOnCodeChange && extendCompare(_data)

        props.onChange && props.onChange({data: _data, sendKey: 'codeChanges'})

        if (opts.codeChangeUrl) {
            global.http.post(opts.codeChangeUrl, {
                hash: hashInfo?.audioHash,
                data: {
                    time: props.timeSpent,
                    activeFileInd,
                    code, activeFileName
                },
            })
        }
    }

    function loadFiles(opts) {
        let {items, activeFileInd = 0} = props.getCodeFiles(item, hist, opts);
        setFiles(items)
        activeFiles = items.map((it, ind) => {
            it.ind = ind
            return it;
        }).filter(it => !it.isTopVisible);
        setActiveFiles(activeFiles)
        setFiles(items)
        setActiveFileInd(activeFileInd)
    }


    function onReStartAttempt(data, activeInd) {
        loadFiles({restart: true});
        setPlainValue('');
        props.onReStartAttempt && props.onReStartAttempt(data, activeInd)
    }

    function onChangeHash(hashInfo) {
        console.log("qqqqq hash info", hashInfo);
        setHashInfo(hashInfo)
    }

    //
    // function onTyping() {
    //
    // }
    //
    //
    // function onSetPlainValue(code) {
    //     setPlainValue(code)
    //     console.log("qqqqq CODE PLAIN VALIE", code);
    //     props.onChange && props.onChange({data: {files, activeFile, activeFileInd, code}})
    //
    //
    //     if (opts.codeChangeUrl) {
    //         global.http.post(opts.codeChangeUrl, {
    //             hash: hashInfo?.audioHash,
    //             data: {
    //                 time: props.timeSpent,
    //                 activeFileInd: -1,
    //                 code, activeFileName: 'PlainInput'
    //             },
    //         })
    //     }
    //
    // }

    function onTimeOut() {
        activeEl.current.onTimeOut && activeEl.current.onTimeOut()
    }

    useImperativeHandle(ref, () => ({
        onTimeOut,
    }));

    let activeFile = (activeFiles || [])[activeFileInd] || {};
    console.log("qqqqq active File", activeFile, activeFiles, activeFileInd);

    return <div className={'row codeReview'}>
        <div className="col-sm-12">

            <hr/>
        </div>
        <div className="col-sm-4">
            <div className="ib2 codeWrapMenu" style={{zoom: 1}}>
                <AudioShort
                    {...props}
                    ref={activeEl}

                    item={item}

                    woTitle={false}
                    showCodeRate={true}
                    showRecognizedText={true}
                    opts={opts}
                    onReStartAttempt={onReStartAttempt}
                    onChangeHash={onChangeHash}
                    onChange={onChange}
                ></AudioShort>
            </div>
            {/*<div className="tc">*/}
            {/*    CodeREview {status}*/}
            {/*    <Button onClick={(cb) => {*/}
            {/*        onRestart();*/}
            {/*        cb && cb();*/}
            {/*    }}>Перезапустить</Button>*/}
            {/*    <Button onClick={(cb) => {*/}
            {/*        onSend()*/}
            {/*        props.onNext && props.onNext()*/}
            {/*    }}>Далее</Button>*/}
            {/*    <div></div>*/}
            {/*</div>*/}
        </div>
        <div className={"col-sm-8 " + (isActive ? '' : 'o5')}>
            {(files || []).map((file, ind) => {
                let {isTopVisible} = file || {}
                if (!isTopVisible) {
                    return null
                }
                return (<div key={ind}>
                    {file.name}
                    <FileEditWithInd
                        ind={ind}
                        readOnly={!isActive}
                        activeFile={file}
                        onChangeCode={onChangeCode}
                    ></FileEditWithInd>
                </div>)
            })}
            {/*{Boolean(files && files.length) && <hr/>}*/}

            {activeFiles && !!activeFiles.length && <>
                {!!activeFiles && activeFiles.length > 1 && (activeFiles || []).map((it, ind) => {
                    console.log("qqqqq fileeeeee", it);
                    let isActiveFile = ind == activeFileInd;
                    return (<div key={ind} className={'fileTab ib ' + (isActiveFile ? ' active' : '')}
                                 onClick={() => setActiveFileInd(ind)}>
                        {it.name}
                    </div>)
                })}

                {activeFile && <FileEditWithInd
                    ind={activeFile.ind}
                    readOnly={!isActive}
                    activeFile={activeFile}
                    onChangeCode={onChangeCode}
                ></FileEditWithInd>}
            </>}
        </div>


    </div>
})

function FileEditWithInd(props) {
    let {activeFile, readOnly, onChangeCode, ind} = props;
    let {code} = activeFile || {};
    return <LazyEditor
        height={400}
        defaultLanguage={activeFile.lng || 'javascript'}
        language={activeFile.lng}
        defaultValue=""
        options={{
            readOnly,
            minimap: {
                enabled: false
            }
        }}
        onValidate={(e) => {
        }
        }
        value={activeFile.code}
        onChange={(v) => {
            // if (isLogsReader) {
            //     return;
            // }
            if (v != code) {
                onChangeCode(v, ind)
            }
        }
        }
    />

}


//compare Files ADMIN & API intergraiton
function compareResultsCodePreview(item, data) {
    let {files = [], correctAnswers = []} = item || {};
    let dataFiles = data.files || []
    console.log("qqqqq compare results item", {correctAnswers, files, dataFiles});
    let filesToCompare = files.map((it, ind) => {
        let {code, isPrevCompare, isSmartCompare} = it;
        return {code, isPrevCompare, isSmartCompare, ind}
    }).filter(it => !it.isPrevCompare)

    let isValid = false;
    let debug = []

    function pub(v, isSmartCompare) {
        v = (v == '0' ? v : v || '').trim();
        if (!isSmartCompare) {
            return v;
        }

        v = v
            .replace(/\s+/gi, ' ')
            .replace(/(\,|\;)\s/gi, '$1')
        return v;
    }

    _.each(correctAnswers, (corAnswer, ind) => {
        let {isPrevCompare, isSmartCompare} = (files || [])[ind] || {}
        let corAnswerFiles = (corAnswer || {}).files || []

        let _isValid = true
        let _debug = []
        _.each(filesToCompare, (item, ind) => {
            let compareInd = item.ind;
            let corAnswerFile = (corAnswerFiles[compareInd] || {});
            let code1 = (corAnswerFiles[compareInd] || {}).code;
            let code2 = (dataFiles[compareInd] || {}).code;
            let isSmartCompare = (files[compareInd] || {}).isSmartCompare;

            let _code1 = pub(code1, isSmartCompare)
            let _code2 = pub(code2, isSmartCompare)
            if (_code1 != _code2) {
                _isValid = false;
            }

            _debug.push({
                code1, code2,
                _code1, _code2,
                isSmartCompare, compareInd
            })

        })

        debug.push(_debug)
        isValid = isValid || _isValid;

    })

    return {
        isCompare: Boolean(correctAnswers.length) && Boolean(filesToCompare.length),
        compareCorrectLength: correctAnswers.length,
        compareFilesLength: filesToCompare.length,
        // filesToCompare,
        isCorrect: isValid,
        debug
    }


}

//compare Files ADMIN & API intergraiton

export default CodeReview
