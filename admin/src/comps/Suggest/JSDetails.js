import Smart from "../../libs/Smart";
// import MonacoEditor from "react-monaco-editor";
import React, { useEffect, useState } from "react";
import CustomStorage from "./CustomStorage";
import LazyEditor from "../LazyEditor/LazyEditor";
import { Editor } from "@monaco-editor/react";

const SmartMemo = React.memo(function (props) {
    return <Smart {...props}></Smart>
}, (v1, v2) => {
   //console.log('SMART MEMEO', v1.memo, v2.memo, v2.name)
    return v1.memo == v2.memo;
})
function JSDetails(props) {
    let [loading, setLoading] = useState(false)
    let [data, setData] = useState({})
    let { localItem = {}, customData = {} } = props || {};
    let question = (localItem || {})._id || props.questionId;
    let isCustom = Boolean(customData.onChangeDetails);
    let keyId = (customData || {}).keyId;

    window.setJsDetailsData = (data) => {
        setData(data);
        autoSave(data)
    }
    useEffect(() => {
        if (!isCustom && question ) {
            setLoading(true)
            global.http.get('/get-js-details', { question })
                .then(it => {
                    setLoading(false)
                    it.details = it.details || {};
                    setData({ ...it })
    
                })
        }
       
    }, [question])


    useEffect(() => {
        isCustom && keyId && setData({ ...customData.jsDetails })
        // setLoading(false)
    }, [keyId])

    function autoSave(data) {
        customData.onChangeDetails && customData.onChangeDetails(data)
        !isCustom && global.http.put('/js-details', data).then(it => {
            // console.log("qqqqq PROPS JS DETAILS PUT DATA", it);
        })

    }
   //console.log('jsdetails props', data)

    if (loading ) {
        return <div>Loading ...</div>
    }

    let isJsType = true || localItem.type == 'js-task'
    

    return !isJsType ? null : <div className={loading ? 'o5' : ''}>
        <div className="pull-right">
            <a href={'https://razvitie.itrum.ru/run?question=' + localItem._id} target="_blank"
                style={{ marginRight: '10px' }}>https://razvitie.xxx</a>
            <a href={'http://localhost:3001/run?question=' + localItem._id} target="_blank">http://localhost</a>
        </div>
      
        <Smart
            onChange={(v) => {
                data.details = { ...data.details, v };
                setData({ ...data })
                autoSave(data);
            }}
            obj={data.details}
            items={[
                { size: 12, type: 'HR' },
                {
                    size: 2,
                    type: 'select',
                    key: 'codeType',
                    name: 'CodeType',
                    items: ['', 'js', 'promise', 'async', 'react', 'html', 'logreader']
                },
                { size: 2, key: 'timeout', name: 'Timeout (to wait async)' , onChange: () => {
                    global.resetMemo('editor')
                }},
                {
                    size: 2,
                    type: 'select',
                    key: 'hideRunStatus',
                    name: 'hideRunStatus',
                    items: ['', 'hidden']
                },
                {
                    size: 2,
                    type: 'select',
                    key: 'originalSolutionStatus',
                    name: 'originalSolutionStatus',
                    items: ['', 'shown']
                },
                {
                    size: 3, Component: (pp) => {
                        return <button onClick={() => {
                            try {
                                let jsDetails = JSON.parse(JSON.stringify(data));

                                let v = window.prompt('insert Data')
                                let _data = eval(`window.vv = ${v}`)//JSON.parse(v)
                                _data = window.vv;

                                let detailedFields = [
                                    'acceptanceRate',
                                    'submissions',
                                    'accepted',
                                    'dislike',
                                    'like',
                                    'title',
                                    'similar',
                                    'startCode',
                                    'title',
                                    'url',
                                    'hints',
                                    'hints_ru',
                                    'video',
                                    'last_updated',
                                    'tags',
                                    'lvl',
                                ]
                                // console.log("qqqqq data", data);
                                let LCDetails = detailedFields.reduce((acc, field) => {
                                    acc[field] = _data[field]
                                    return acc;
                                }, {})

                                function remCode(str, it) {
                                    if (it && it.name && it.name === 'ChatGPT answer') {
                                        return str;
                                    }
                                    if (!str) {
                                        return ''
                                    }
                                    return (str || '').replace(/(Python3|Java)\n/gi, '').replace(/\n/gi, '@@@').replace(/\`(.+?)\`/gi, '').replace(/\@\@\@/gi, '\n')
                                }

                                let item = props.localItem;

                                item.name = _data.descriptionMD_RU || item.name || '';
                                item.hints = (_data.hints_ru || []).map(it => {
                                    return { desc: it }
                                }) || item.hints || _data.hints;
                                jsDetails.details = jsDetails.details || {};
                                let testCases = _data.testCase || []

                                let keys = (testCases[0] || {}).test || [];
                                let fields = Object.keys(keys).map(it => {
                                    return { name: it }
                                });

                                jsDetails.details = {
                                    codeType: 'js',
                                    fnName: (_data.title || '').replace(/[0-9]+\./gi, '').replace(/\s/gi, ''),
                                    fields
                                }
                                item.useCases = _data.solutions.map((it, ind) => {
                                    let code = ((it.implementation || []).filter(it2 => it2.lang === 'JavaScript')[0] || {}).code || ''
                                   //console.log("qqqqq code code code", code);
                                    if (code) {
                                        jsDetails.details.correctSolution = code;
                                    }
                                    return {
                                        name: 'Алгоритм ' + (ind + 1),
                                        desc: remCode(it.description_md_ru, it) + (!code ? '' : ("\n\n```jsx\n" + (code || '').replace(/\`\`\`/gi, '') + "\n```")),
                                        code
                                    }
                                }) || item.useCases || [];

                                item.type = 'js-task'
                                item.difficulty = (_data.lvl || '').toLowerCase()


                                let str = testCases.map(testCase => {
                                    let v = Object.keys(testCase.test).map(key => {
                                        return JSON.stringify(testCase.test[key])
                                    }).join('\n')
                                   //console.log("qqqqq vvv", v);
                                    return v;
                                }).join('\n');

                                jsDetails.details.pubCasesStr = str;
                                jsDetails.details.testCasesStr = str;
                                let details = jsDetails.details || {};
                                jsDetails.details.starter = `var ${details.fnName} = function (${details.fields.map(it => it.name).join(', ')}) {
            
}`

                                item.LCDetails = LCDetails;

                                setData(jsDetails)
                                autoSave(jsDetails);
                                props.onChange && props.onChange(item)
                               //console.log("qqqqq data", item);
                            } catch (e) {
                               //console.log("qqqqq eeeee", e);
                            }

                        }}>Pull Letcode</button>
                    }
                },
                { size: 12, Component: () => <div></div> },
                {
                    size: 6, childs: [


                        {
                            size: 12, defSize: 12, childs: [
                                {
                                    Component: ({ item }) => {
                                        return <>
                                            <div className={'title-use-case'}>Название функции</div>
                                        </>
                                    },
                                },
                                {
                                    size: 12, Component: () => <button
                                        onClick={() => {
                                            let details = data.details;
                                            details.starter = `var ${details.fnName} = function (${details.fields.map(it => it.name).join(', ')}) {

};`
                                            data.details = details;
                                            setData({ ...data })
                                            autoSave(data)
                                        }}
                                    >Generate</button>
                                },

                                { key: 'fnName', name: ' ', size: 7 },
                                { key: 'returnType', name: '', size: 5 },

                                {
                                    Component: ({ item }) => {
                                        return <>
                                            <div className={'title-use-case'}>Филды</div>
                                        </>
                                    },
                                },

                                {
                                    name: 'Филды',
                                    key: 'fields',
                                    notFoundText: 'Добавьте поле',
                                    addName: '++ Добавить поле ++',
                                    sortable: true,
                                    showTopAdd: true,

                                    // defClass: 'video-list-parent',
                                    each: [
                                        { key: 'name', name: '', type: 'textarea', minRows: 1, size: 7 },
                                        { key: 'returnType', name: '', size: 5 },

                                        // {key: 'res', name: 'Ожид результат', type: 'textarea', minRows: 1, size: 6},

                                    ]
                                },

                                // {
                                //     name: 'Тест Кейсы',
                                //     key: 'pubTestCases',
                                //     notFoundText: 'Добавьте тест кейс',
                                //     addName: '++ Добавить тест кейс ++',
                                //     sortable: true,
                                //     showTopAdd: true,
                                //
                                //     // defClass: 'video-list-parent',
                                //     each: [
                                //         {key: 'params', name: '', type: 'textarea', minRows: 1, size: 7},
                                //         {key: 'res', name: '', type: 'textarea', minRows: 1, size: 5},
                                //         // {key: 'res', name: 'Ожид результат', type: 'textarea', minRows: 1, size: 6},
                                //
                                //     ]
                                // },
                            ]
                        },

                        {
                            size: 12, defSize: 12, childs: [
                                {
                                    Component: ({ item }) => {
                                        return <>
                                            <div className={'title-use-case'}>Файлы</div>
                                        </>
                                    },
                                },

                                {
                                    name: 'Файлы',
                                    key: 'files',
                                    notFoundText: 'Добавьте файл',
                                    addName: '++ Добавить файл ++',
                                    sortable: true,
                                    showTopAdd: true,

                                    // defClass: 'video-list-parent',
                                    each: [
                                        { key: 'name', name: '', type: 'input', minRows: 1, size: 6 },
                                        // {key: 'returnType', name: '', size: 5},
                                        // {key: 'res', name: 'Ожид результат', type: 'textarea', minRows: 1, size: 6},
                                    ]
                                },

                                // {
                                //     size: 12,
                                //     name: 'Тест Кейсы',
                                //     key: 'testCases',
                                //     notFoundText: 'Добавьте тест кейс',
                                //     addName: '++ Добавить тест кейс ++',
                                //     sortable: true,
                                //     showTopAdd: true,
                                //
                                //     // defClass: 'video-list-parent',
                                //     each: [
                                //         {key: 'params', name: '', type: 'textarea', minRows: 1, size: 7},
                                //         {key: 'res', name: '', type: 'textarea', minRows: 1, size: 5},
                                //     ]
                                // },
                            ]
                        },
                        {
                            size: 12,
                            Component: ({ item }) => {
                                return <>
                                    <div className={'title-use-case'}>Публичные Тест кейсы</div>
                                </>
                            },
                        },
                        {
                            size: 12,
                            key: 'pubCasesStr', type: 'textarea'
                        },
                        {
                            size: 12,
                            Component: (props) => <ExecTests fieldKey={'pubCasesStr'} {...props}></ExecTests>
                        },
                        { size: 12, type: 'hr' },
                        {
                            size: 12, Component: ({ item }) => {
                                return <>
                                    <div className={'title-use-case'}>Все Тест кейсы</div>
                                </>
                            },

                        },
                        {
                            key: 'testCasesStr', size: 12, type: 'textarea'
                        },
                        {
                            size: 12,
                            Component: (props) => <ExecTests fieldKey={'testCasesStr'} {...props}></ExecTests>
                        }


                    ]
                },


                {
                    size: 6, Component: ({ item }) => {
                        return <>
                            <div className={'title-use-case'}></div>
                        </>
                    },

                },
                // ]},
                {
                    size: 6,
                    // memoKey: 'editor',
                    // path: 'Suggest/EditorViewJsDetails'
                    Component: EditorView
                    // (props) =>{
                    //     return  <EditorView {...props} setData={setData} autoSave={autoSave}></EditorView>
                    // },
                }]}>
        </Smart>
    </div>
}

function EditorView(props) {
    let { item, resetMemo } = props;
    // function autoSave() {

    // }
    function setData(data) {
        window.setJsDetailsData({...data})
    }
   //console.log('propsssssssVIEW', props)
    let [selectedFileInd, setSelectedFileInd] = useState(0)
    let [selectedSolutionFileInd, setSelectedSolutionFileInd] = useState(0)
    let { files } = item || {};
    files = files || [];
    let isFiles = files && files.length > 0;
    let selectedFileName = (files[selectedFileInd] || {}).name
    let selectedSolutionFileName = (files[selectedSolutionFileInd] || {}).name
    let data = {details: item}
    data.details = data.details || {};
    data.details.starterFiles = data.details.starterFiles || {};
    data.details.solutionFiles = data.details.solutionFiles || {};

    function getFileExt(name) {
        let arr = (name || '').split('.')
        let last = arr[arr.length - 1];
        let ext = last === 'css' ? 'css' : last === 'html' ? 'html' : last === 'ts' ? 'typescript' : 'javascript';

        return ext;
    }

    // console.log("RENDER EDITOR", data)
    return <>
        <div>Показ для запуска</div>
        {isFiles && (files || []).map((it, ind) => {
            return <div
                onClick={() => {
                    setSelectedFileInd(ind)
                }}
                className={'ib filesItem ' + (ind === selectedFileInd ? 'correct' : '')}>{it.name || '-'}</div>
        })}
        <LazyEditor
            height="300px"
            defaultLanguage={getFileExt(selectedFileName)}
            language={getFileExt(selectedFileName)}
            value={
                !isFiles ? data.details.starter || '' : (data.details.starterFiles[selectedFileName] || '')
            }
            // value={}
            onChange={(solution) => {
                // localItem.jsDetails ??= {}
                // props.onChange({...props.localItem, solution})
                if (isFiles) {
                    data.details.starterFiles[selectedFileName] = solution;
                } else {
                    data.details.starter = solution;
                }
                // resetMemo()
                setData({...data})
                // autoSave(data)
            }}
        />
        <div>Правильное решение</div>
        {isFiles && (files || []).map((it, ind) => {
            return <div
                onClick={() => {
                    setSelectedSolutionFileInd(ind)
                }}
                className={'ib filesItem ' + (ind === selectedSolutionFileInd ? 'correct' : '')}>{it.name || '-'}</div>
        })}
        <LazyEditor
            height="500px"
            defaultLanguage={getFileExt(selectedSolutionFileName)}
            language={getFileExt(selectedSolutionFileName)}
            value={
                !isFiles
                    ? ((data.details || {}).correctSolution || '')
                    : (data.details.solutionFiles[selectedSolutionFileName] || '')
            }
            // value={(data.details || {}).correctSolution || ''}
            // value={}
            onChange={(solution) => {
                if (isFiles) {
                    data.details.solutionFiles[selectedSolutionFileName] = solution;

                } else {
                    data.details.correctSolution = solution;
                }
                // resetMemo && resetMemo();
                setData({...data})
                // autoSave(data)

            }}
        />
        <label>Юнит Тесты
            <span className="ib" style={{ marginTop: '-12px', marginLeft: '10px' }}><input
                type={"checkbox"} checked={(data.details || {}).isUnitTests}
                onChange={(e) => {
                    data.details.isUnitTests = e.target.checked;
                    // resetMemo && resetMemo();
                    setData({ ...data })
                    setTimeout(() => {
                        setData({ ...data })
                    }, 10)

                }
                } />
            </span>
        </label>

        {(data.details || {}).isUnitTests && <LazyEditor
            height="500px"
            defaultLanguage="javascript"
            language="javascript"
            value={(data.details || {}).unitTests || ''}
            // value={}
            onChange={(solution) => {
                data.details.unitTests = solution;
       
                // resetMemo && resetMemo();
                setData(data)
            }}
        />}
    </>
}
function ExecTests(props) {
    let [results, setResults] = useState(null)

    return <div>
        <hr />
        <button className={'btn btn-xs btn-default'} onClick={() => {
            let casesStr = props.localItem[props.fieldKey];
            let { fields, fnName, correctSolution } = props.localItem;
            global.http.post('/admin-get-responses', {
                casesStr,
                fields,
                FN_NAME: fnName,
                codeStr: correctSolution,
                questionId: CustomStorage.getId()
            })
                .then(r => {
                    setResults(r)
                   //console.log("qqqqq rrrr", r);
                })

           //console.log("qqqqq on run tests", props);
        }}>Get DebugLogs
        </button>
        {results && <>
            <div></div>
            <small>Results</small>
            <pre>{results.RESULTS}</pre>
            <small>Run FN</small>
            <pre>{results.RUN_FILE}</pre>
            <small>Cases File</small>
            <pre>{results.CASES_FILE}</pre>
            <small>FOLDER</small>
            <pre>{results.FOLDER}</pre>
        </>}
    </div>
}


function MonWrap(props) {
    let { localItem, item } = props;

    useEffect(() => {

    }, [localItem])
    if (localItem.reactLoading) return <div>Loading ...</div>
    let solution = (localItem || {}).solution;
   //console.log("localItem444", solution, localItem)
    // localItem.jsDetails = {}
    return <div>
        <LazyEditor
            height="500px"
            defaultLanguage="javascript"
            language="javascript"
            value={solution}
            // value={}
            onChange={(solution) => {
                // localItem.jsDetails ??= {}
               //console.log("JS DETAILS qqqqq vvvvvvvvv localItem444 Props", props, localItem)
                props.onChange({ ...props.localItem, solution })
            }}
        />
    </div>
}

export default JSDetails;