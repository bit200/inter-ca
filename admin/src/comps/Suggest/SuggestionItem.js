import React, {useState, useEffect, useCallback} from 'react';
import _ from 'underscore';
import Smart from 'libs/Smart';

import {
    Link, Outlet
} from "react-router-dom";
import './SuggestionItem.css';
import QuestionDetails from './QuestionDetails'
// import Editor from '@monaco-editor/react';
import JSDetails from './JSDetails'
import DuplicatePreview from "./DuplicatePreview";
import MyModal from "../../libs/MyModal";
import QuizPreview from "./QuizPreview";
import Button from "../../libs/Button";
import CustomStorage from './CustomStorage';
import LazyDiffEditor from "../LazyEditor/LazyDiffEditor";
import QuizEditor from './QuizEditor';
// readOnly: true,preview: 'edit',
let isAdmin = global.env.isAdmin;
let eqTimer, eqObj = {};
let QuizEditFields = [
    {
        size: 12,
        classFn: (item, v, a) => {
            // let item = props.parentObj;
            //console.log("qqqqq itememememememmeme 1.1", item, v, a);
            return item.isValid ? 'p15-0' : 'error-quiz p15-0'
        },
        childs: [
            {size: 12, type: 'hr'},
            {name: 'Статус', key: 'status', size: 12, type: 'group', list: ['', 'active', 'unactive']},
            {name: 'Вопрос', key: 'name', size: 12, type: 'md'},
            // {size: 8, type: 'hr'},
            // {name: 'questionId', key: 'question', size: 4, type: 'input'},
            {type: 'HR', size: 12},
            {
                size: 12,
                key: 'variations',
                sortable: true,
                notFoundText: 'Добавьте вариант ответа',
                addName: '+ Вариант ответа',
                each: [
                    {name: 'isCorrect', key: 'isCorrect', type: 'checkbox', size: 1},
                    {name: ' ', key: 'name', type: 'textarea', minRows: 1, size: 11},
                ]
            }
        ]
    }
]

// let editQuestion = [
//     {name: 'Короткое название', key: 'title', type: 'input', size: 12},
//     {name: 'Вопрос', key: 'name', type: 'md', size: 12,},
//     {name: 'Теги', path: 'Suggest/TagSelector', size: 6},
// ]
let editQuestion = [
    {
        tabs: [
            {
                name: t('mainMain'), childs: [
                    // {name: 'Type', key: 'status', type: 'group', list: [{
                    //         key: 'edit',
                    //         name: 'Редактирую'
                    //     }, {
                    //         name: 'Отправлено',
                    //         key: 'sent'
                    //     }, {
                    //         name: 'Отменено',
                    //         key: 'canceled'
                    //     }],
                    //     size: 12},

                    // {
                    //     memoFn(field, props) {
                    //         // console.log('memo key888', props)
                    //         return 'quizAdmin_' + (props.obj || {}).questionId
                    //     },
                    //     size: 12,
                    //     Component: QuizAdminInsideQuestion
                    // },
                    // {
                    //     isVisible: () => isAdmin,
                    //     Component: ({item}) => {
                    //         let [open, setOpen] = useState(false)
                    //
                    //         if (!item || !item.LCDetails) return <></>
                    //         return <><a style={{padding: '10px 20px 10px 0', display: 'inline-block'}}
                    //                     href={item.LCDetails.url}
                    //                     target={"_blank"}>{item.LCDetails.url}</a>
                    //             <a className={'ib '} style={{paddingTop: '10px'}} onClick={() => {
                    //                 setOpen(!open)
                    //             }}>Toggle Details</a>
                    //             {open && <pre>{JSON.stringify(item.LCDetails, null, 4)}</pre>}
                    //         </>
                    //     }, size: 12
                    // },
                    // {
                    //     Component: ({item, localItem}) => {
                    //         return <div>{item.originalDuplicateId
                    //             ? <>ЭТО ДУБЛИКАТ
                    //                 <div></div>
                    //                 <Link to={'/theme-question/' + item.originalDuplicateId}>Оригинал:
                    //                     #{item.originalDuplicateId}</Link>
                    //                 <hr/>
                    //             </>
                    //             : ''}</div>
                    //     }, size: 12
                    // },
                    // {
                    //     isVisible: () => isAdmin,
                    //     name: 'Type',
                    //     key: 'type',
                    //     type: 'group',
                    //     list: [{name: '----', value: ''}, 'question', 'task', 'js-task'],
                    //     size: 6
                    // },
                    {
                        name: 'difficulty',
                        key: 'difficulty',
                        type: 'group',
                        list: [{name: '----', value: ''}, 'easy', 'medium', 'hard'],
                        size: 6
                    },
                    // {
                    //     memoFn(field, props) {
                    //         // console.log('memo key888', props)
                    //         return 'quizAdmin_' + (props.obj || {}).questionId
                    //     },
                    //     size: 12,
                    //     Component: QuizAdminInsideQuestion
                    // },
                    // {
                    //     isVisible: () => isAdmin,
                    //     Component: ({item}) => {
                    //         let [open, setOpen] = useState(false)
                    //
                    //         if (!item || !item.LCDetails) return <></>
                    //         return <><a style={{padding: '10px 20px 10px 0', display: 'inline-block'}}
                    //                     href={item.LCDetails.url}
                    //                     target={"_blank"}>{item.LCDetails.url}</a>
                    //             <a className={'ib '} style={{paddingTop: '10px'}} onClick={() => {
                    //                 setOpen(!open)
                    //             }}>Toggle Details</a>
                    //             {open && <pre>{JSON.stringify(item.LCDetails, null, 4)}</pre>}
                    //         </>
                    //     }, size: 12
                    // },
                    // {
                    //     Component: ({item}) => {
                    //         let [open, setOpen] = useState(false)
                    //
                    //         if (!item || !item.LCDetails) return <></>
                    //         return <><a  style={{padding: '10px 20px 10px 0', display: 'inline-block'}} href={item.LCDetails.url} target={"_blank"}>{item.LCDetails.url}</a>
                    //             <a className={'ib '} style={{paddingTop: '10px'}} onClick={() => {setOpen(!open)}}>Toggle Details</a>
                    //             {open && <pre>{JSON.stringify(item.LCDetails, null, 4)}</pre>}
                    //         </>
                    //     }, size: 12
                    // },
                    {
                        Component: ({item, localItem}) => {
                            return <div>{item.originalDuplicateId
                                ? <>ЭТО ДУБЛИКАТ
                                    <div></div>
                                    <Link to={'/theme-question/' + item.originalDuplicateId}>Оригинал:
                                        #{item.originalDuplicateId}</Link>
                                    <hr/>
                                </>
                                : ''}</div>
                        }, size: 12
                    },
                    {
                        isVisible: () => isAdmin,
                        name: 'Type',
                        key: 'type',
                        type: 'group',
                        list: [{name: '----', value: ''}, 'question', 'task', 'js-task'],
                        size: 6
                    },

                    // {
                    //     size: 6, Component: ({item, onChange, autoSaveFn}) => {
                    //         // console.log("qqqqq item", item);
                    //         return <>
                    //             <button
                    //                 className={'btn btn-xs btn-light ' + (item.isForModeratorApprove ? '' : 'active')}
                    //                 onClick={() => {
                    //                     autoSaveFn({...item, isForModeratorApprove: false})
                    //                 }}>Проверено
                    //             </button>
                    //             <button
                    //                 className={'btn btn-xs  ' + (item.isForModeratorApprove ? 'active btn-danger' : ' btn-light')}
                    //                 onClick={() => {
                    //                     autoSaveFn({...item, isForModeratorApprove: true})
                    //                 }}>На модерации
                    //             </button>
                    //             {/*<Link to={'/find-duplicates'} className={'btn btn-xs btn-default'}>Пометить дубликатом</Link>*/}
                    //         </>
                    //     }
                    // },


                    // {size: 12, isVisible: () => isAdmin, Component: JSDetails},
                    // { size: 12, isVisible: () => !isAdmin, type: 'HR' },

                    {

                        Component: ({item}) => {
                            // console.log("qqqqq isForModeratorApprove", item);
                            let _modal;
                            let {MyModal} = global;
                            return <div className='pull-right'>
                                <button className='btn btn-xs btn-light ' onClick={() => {
                                    //console.log('Open Preiview')
                                    _modal.show()
                                }}>{t('preview')}
                                </button>
                                {/* <button className='btn btn-xs btn-default' onClick={() => {
                    generateSuggestion(item._id || CustomStorage.getId())
                }}>Предложить контент
                </button> */}
                                <MyModal
                                    title={item._id || 'Question Preview'}
                                    size={'full'}
                                    ref={(el) => _modal = el}
                                >
                                    <QuestionDetails woSuggestions={true} showSolution={true} question={item}
                                                     showName={true}></QuestionDetails>
                                </MyModal>
                            </div>
                        },
                        size: 12
                    },

                    // { name: 'Коммент', key: 'comment', type: 'textarea', minRows: 1, size: 12 },
                    {name: 'shortTitle', key: 'title', type: 'input', size: 12},
                    {name: 'question', key: 'name', type: 'md', size: 12,},
                    {name: 'tags', path: 'Suggest/TagSelector', size: 6},
                    {name: 'answer', key: 'answer', type: 'md', defClass: 'md-answer', size: 12},

                ]
            },
            {
                name: t('video'), childs: [
                    {
                        name: t('video'), key: 'videos', size: 12,
                        notFoundText: t('addVideo'),
                        addName: `+ ${t('addVideo')}`,
                        sortable: true,
                        showTopAdd: true,
                        woBottom: true,

                        defClass: 'video-list-parent',
                        each: [
                            {key: 'name', name: 'name1', type: 'input', minRows: 1, size: 8},
                            {key: 'href', name: 'link', type: 'input', minRows: 1, size: 4},
                        ]
                    },]
            },
            {
                name: t('interestingFacts'), childs: [
                    // {
                    //     size: 12, Component: ({item}) => {
                    //         return <div className={'title-use-case'}>Интересные факты
                    //             ({(item.facts || []).length})</div>
                    //     },
                    //
                    // },
                    {
                        name: t('interestingFacts'), key: 'facts', size: 12,
                        notFoundText: t('addFact'),
                        addName: `+ ${t('addFact')}`,
                        sortable: true,
                        showTopAdd: true,
                        woBottom: true,

                        defClass: 'video-list-parent',
                        each: [
                            {key: 'name', name: ('name1'), type: 'textarea', minRows: 1, size: 6},
                            {
                                key: 'videos',
                                defClass: 'video-list',
                                size: 6,
                                sortable: false,
                                notFoundText: ' ',
                                addName: `+ ${t('video')}`,
                                woImg: true,
                                woBottom: true,
                                each: [
                                    {key: 'name', name: 'name', type: 'input', minRows: 1, size: 8},
                                    {key: 'href', name: 'link', type: 'input', minRows: 1, size: 4},
                                ]
                            },
                            {key: 'desc', name: 'desc', type: 'md', defClass: 'md-desc', size: 12},
                            {type: 'HR', size: 12},

                        ]
                    },]
            },
            {
                name: 'Кейсы', childs: [
                    //     {
                    //     size: 12, Component: ({item}) => {
                    //         return <div className={'title-use-case'}>ЮзКейсы / Решения задач
                    //             ({(item.useCases || []).length})</div>
                    //     }
                    // },
                    {
                        name: t('cases'), key: 'useCases', size: 12,
                        notFoundText: t('addCase'),
                        addName: `+ ${t('addCase')}`,
                        sortable: true,
                        showTopAdd: true,
                        defClass: 'video-list-parent',
                        each: [
                            {key: 'name', name: ('name1'), type: 'textarea', minRows: 1, size: 6},
                            {
                                key: 'videos',
                                defClass: 'video-list',
                                size: 6,
                                sortable: false,
                                notFoundText: ' ',
                                addName: `+ ${t('video')}`,
                                woBottom: true,
                                woImg: true,


                                each: [
                                    {key: 'name', name: 'name', type: 'input', minRows: 1, size: 8},
                                    {key: 'href', name: 'link', type: 'input', minRows: 1, size: 4},
                                ]
                            },
                            {key: 'desc', name: 'desc', type: 'md', defClass: 'md-desc', size: 12},
                            {type: 'HR', size: 12},

                        ]
                    },]

            },
            {
                name: t('hints'), childs: [

                    {
                        name: t('hints'), key: 'hints', size: 12,
                        notFoundText: t('addHint'),
                        addName: `+ ${t('addHint')}`,
                        sortable: true,
                        showTopAdd: true,
                        woBottom: true,
                        woImg: true,
                        defClass: 'video-list-parent',
                        each: [
                            {key: 'desc', name: 'desc', type: 'md', defClass: 'md-desc', size: 12},

                        ]
                    },
                ]
            }]
    },
    // {
    //     memoFn(field, props) {
    //         // console.log('memo key888', props)
    //         return 'quizAdmin_' + (props.obj || {}).questionId
    //     },
    //     size: 12,
    //     Component: QuizAdminInsideQuestion
    // },
    // {
    //     isVisible: () => isAdmin,
    //     Component: ({ item }) => {
    //         let [open, setOpen] = useState(false)
    //
    //         if (!item || !item.LCDetails) return <></>
    //         return <><a style={{ padding: '10px 20px 10px 0', display: 'inline-block' }} href={item.LCDetails.url}
    //             target={"_blank"}>{item.LCDetails.url}</a>
    //             <a className={'ib '} style={{ paddingTop: '10px' }} onClick={() => {
    //                 setOpen(!open)
    //             }}>Toggle Details</a>
    //             {open && <pre>{JSON.stringify(item.LCDetails, null, 4)}</pre>}
    //         </>
    //     }, size: 12
    // },
    // // {
    // //     Component: ({item}) => {
    // //         let [open, setOpen] = useState(false)
    // //
    // //         if (!item || !item.LCDetails) return <></>
    // //         return <><a  style={{padding: '10px 20px 10px 0', display: 'inline-block'}} href={item.LCDetails.url} target={"_blank"}>{item.LCDetails.url}</a>
    // //             <a className={'ib '} style={{paddingTop: '10px'}} onClick={() => {setOpen(!open)}}>Toggle Details</a>
    // //             {open && <pre>{JSON.stringify(item.LCDetails, null, 4)}</pre>}
    // //         </>
    // //     }, size: 12
    // // },
    // {
    //     Component: ({ item, localItem }) => {
    //         return <div>{item.originalDuplicateId
    //             ? <>ЭТО ДУБЛИКАТ
    //                 <div></div>
    //                 <Link to={'/theme-question/' + item.originalDuplicateId}>Оригинал:
    //                     #{item.originalDuplicateId}</Link>
    //                 <hr />
    //             </>
    //             : ''}</div>
    //     }, size: 12
    // },
    // {
    //     isVisible: () => isAdmin,
    //     name: 'Type',
    //     key: 'type',
    //     type: 'group',
    //     list: [{ name: '----', value: '' }, 'question', 'task', 'js-task'],
    //     size: 6
    // },
    // {
    //     name: 'Сложность',
    //     key: 'difficulty',
    //     type: 'group',
    //     list: [{ name: '----', value: '' }, 'easy', 'medium', 'hard'],
    //     size: 6
    // },
    //
    // {
    //     size: 6, Component: ({ item, onChange, autoSaveFn }) => {
    //         // console.log("qqqqq item", item);
    //         return <>
    //             <button className={'btn btn-xs btn-default ' + (item.isForModeratorApprove ? '' : 'active')}
    //                 onClick={() => {
    //                     autoSaveFn({ ...item, isForModeratorApprove: false })
    //                 }}>Проверено
    //             </button>
    //             <button className={'btn btn-xs  ' + (item.isForModeratorApprove ? 'active btn-danger' : ' btn-default')}
    //                 onClick={() => {
    //                     autoSaveFn({ ...item, isForModeratorApprove: true })
    //                 }}>На модерации
    //             </button>
    //             {/*<Link to={'/find-duplicates'} className={'btn btn-xs btn-default'}>Пометить дубликатом</Link>*/}
    //         </>
    //     }
    // },
    //
    //
    // // {size: 12, isVisible: () => isAdmin, Component: JSDetails},
    // // { size: 12, isVisible: () => !isAdmin, type: 'HR' },
    //
    // {
    //
    //     Component: ({ item }) => {
    //         // console.log("qqqqq isForModeratorApprove", item);
    //         let _modal;
    //         let { MyModal } = global;
    //         return <div className='pull-right'>
    //             <button className='btn btn-xs btn-light ' onClick={() => {
    //                //console.log('Open Preiview')
    //                 _modal.show()
    //             }}>Превью
    //             </button>
    //             {/* <button className='btn btn-xs btn-default' onClick={() => {
    //                 generateSuggestion(item._id || CustomStorage.getId())
    //             }}>Предложить контент
    //             </button> */}
    //             <MyModal
    //                 title={item._id || 'Question Preview'}
    //                 size={'full'}
    //                 ref={(el) => _modal = el}
    //             >
    //                 <QuestionDetails woSuggestions={true} showSolution={true} question={item} showName={true}></QuestionDetails>
    //             </MyModal>
    //         </div>
    //     },
    //     size: 12
    // },
    //
    // // { name: 'Коммент', key: 'comment', type: 'textarea', minRows: 1, size: 12 },
    // { name: 'Короткое название', key: 'title', type: 'input', size: 12 },
    // { name: 'Вопрос', key: 'name', type: 'md', size: 12, },
    // { name: 'Теги', path: 'Suggest/TagSelector', size: 6 },
    // {
    //     key: 'videos',
    //     size: 6,
    //     sortable: true,
    //     notFoundText: ' ',
    //     addName: '+ Видео',
    //     each: [
    //         { key: 'name', name: 'Имя', type: 'input', minRows: 1, size: 8 },
    //         { key: 'href', name: 'Ссылка', type: 'input', minRows: 1, size: 4 },
    //     ]
    // },
    // { name: 'Ответ', key: 'answer', type: 'md', defClass: 'md-answer', size: 12 },
    // { type: 'HR', size: 12 },
    // {
    //     size: 6, Component: ({ item }) => {
    //         return <div className={'title-use-case'}>Интересные факты ({(item.facts || []).length})</div>
    //     },
    // },
    //
    // {
    //     size: 6, Component: ({ item }) => {
    //         return <div className={'title-use-case'}>ЮзКейсы / Решения задач ({(item.useCases || []).length})</div>
    //     },
    // },
    //
    // {
    //     name: 'Интересные Факты', key: 'facts', size: 6,
    //     notFoundText: 'Добавьте факт',
    //     addName: '++ Добавить факт ++',
    //     sortable: true,
    //     showTopAdd: true,
    //
    //     defClass: 'video-list-parent',
    //     each: [
    //         { key: 'name', name: 'name', type: 'textarea', minRows: 1, size: 6 },
    //         {
    //             key: 'videos',
    //             defClass: 'video-list',
    //             size: 6,
    //             sortable: false,
    //             notFoundText: ' ',
    //             addName: '+ Видео',
    //
    //             each: [
    //                 { key: 'name', name: 'Имя', type: 'input', minRows: 1, size: 8 },
    //                 { key: 'href', name: 'Ссылка', type: 'input', minRows: 1, size: 4 },
    //             ]
    //         },
    //         { key: 'desc', name: 'Описание', type: 'md', defClass: 'md-desc', size: 12 },
    //         { type: 'HR', size: 12 },
    //
    //     ]
    // },
    //
    // {
    //     name: 'ЮзКейсы', key: 'useCases', size: 6,
    //     notFoundText: 'Добавьте ЮзКейс',
    //     addName: '++ Добавить ЮзКейс ++',
    //     sortable: true,
    //     showTopAdd: true,
    //     defClass: 'video-list-parent',
    //     each: [
    //         { key: 'name', name: 'Имя', type: 'textarea', minRows: 1, size: 6 },
    //         {
    //             key: 'videos',
    //             defClass: 'video-list',
    //             size: 6,
    //             sortable: false,
    //             notFoundText: ' ',
    //             addName: '+ Видео',
    //
    //             each: [
    //                 { key: 'name', name: 'Имя', type: 'input', minRows: 1, size: 8 },
    //                 { key: 'href', name: 'Ссылка', type: 'input', minRows: 1, size: 4 },
    //             ]
    //         },
    //         { key: 'desc', name: 'Описание', type: 'md', defClass: 'md-desc', size: 12 },
    //         { type: 'HR', size: 12 },
    //
    //     ]
    // },
    // { type: 'HR', size: 12 },
    // {
    //     name: 'Подсказки', key: 'hints', size: 12,
    //     notFoundText: 'Добавьте Подсказку',
    //     addName: '++ Добавить Подсказку ++',
    //     sortable: true,
    //     showTopAdd: true,
    //     defClass: 'video-list-parent',
    //     each: [
    //         { key: 'desc', name: 'Описание', type: 'md', defClass: 'md-desc', size: 12 },
    //
    //     ]
    // },

];


function setReadOnly(editQuestion) {
    return [...editQuestion].map((_it, ind) => {
        let it = {..._it};
        if (it.type === 'md') {
            it.readOnly = true;
            it.preview = 'edit';
            it.commands = [];
            it.name = '';//it.name === 'desc' ? '' : it.name;
            it.defClass = 'preview-only-md'
        }

        if (/input|textarea/gi.test(it.type)) {
            it.type = 'text'
        }

        if (it.childs) {
            it.chidls = setReadOnly(it.childs)
        }
        if (it.each) {
            it.sortable = false;
            it.showTopAdd = false;
            it.woAdd = true;
            it.each = setReadOnly(it.each)
        }

        return it;
    })
}

let editQuestionReadOnly = setReadOnly(editQuestion);

function Editor2(props) {
    const [height, setHeight] = useState(props.height || 270);


    return (

        <LazyDiffEditor
            // height="600"
            language="javascript"
            height={height}
            // editorDidMount={handleEditorDidMount}
            original={props.v1 || ''}
            value={props.v2 || ''}
            options={{
                ignoreTrimWhitespace: true,
                diffAlgorithm: 'advanced',
                automaticLayout: true,
                renderSideBySide: false,
                experimental: {
                    collapseUnchangedRegions: true,
                }
            }}
            onChange={props.onChange}
        />
    );
}

function SuggestionItem({props}) {
    let {localItem} = props;
    //console.log("qqqqq localItme444444444", localItem);
    let isFinilized = !isAdmin && localItem.status === 'approved';
    // let config =

    let [config, setConfig] = useState(getConfig());
    let [filter, setFilter] = useState({});
    let {keyDiff, key2, type1} = filter;

    useEffect(() => {
            let config = getConfig()
            setFilter(config.start)
            setConfig(config)
        }
        , [localItem._id])

    function getConfig() {
        return isAdmin
            ? {
                start: {
                    keyDiff: 'original',
                    key2: 'admin',
                    type1: 'diff',
                },
                statuses: [{
                    key: 'edit',
                    name: 'editing'
                }, {
                    name: 'sent',
                    key: 'sent'
                }, {
                    name: 'approved',
                    key: 'approved'
                }, {
                    name: 'canceled',
                    key: 'canceled'
                }],
                sel1: [
                    {name: 'Оригинал', key: 'original'},
                    {name: 'Предлаг', key: 'suggest'},
                    {name: 'Aдмин', key: 'admin'},
                    {name: 'Последняя', key: 'latest'}
                ],
                sel2: [
                    {name: 'Изменения', key: 'diff'},
                    {name: 'Сорс', key: 'source'},
                    {name: 'Превью', key: 'preview'},
                ]
            }
            : {
                start: {
                    keyDiff: 'original',
                    key2: 'suggest',
                    type1: isFinilized ? 'diff' : 'preview',
                },
                statuses: [{
                    key: 'edit',
                    name: 'editing'
                }, {
                    name: 'sent',
                    key: 'sent'
                }, {
                    name: 'canceled',
                    key: 'canceled'
                }],
                // statuses: statuses.filter(({key}) => key !== 'Проверено'),
                sel1: [
                    // { name: 'Original', key: 'original' },
                    // { name: 'Suggestion', key: 'current' },
                    // { name: 'Admin', key: 'admin' },
                    // { name: 'Latest', key: 'latest' }
                ],
                sel2: [
                    // {name: 'Изменения', key: 'diff'},
                    // { name: 'Source', key: 'source' },
                    {name: 'Превью', key: 'preview'},
                ]
            }
    }

    function StatusAndReason(props) {
        let {isFinilized, config, autoSaveFn} = props.field || {};
        //console.log('propsprops!!!!props', props)
        // let {localItem, lItem} = props;
        // localItem = lItem || localItem
        console.log("qqqqq localItem!!!!", localItem?._id);
        if (isFinilized) {
            return <strong>Статус: Проверено Администратором</strong>
        }
        return <Smart
            obj={localItem}
            items={[
                {name: 'Type', key: 'status', type: 'group', list: config.statuses, size: 12},
                {
                    isVisible: (item) => {
                        return item.status === 'canceled' && isAdmin
                    }, size: 12, key: 'reason', type: 'textarea', label: 'Причина'
                },
                // {
                //     isVisible: (item) => {
                //         return item.status === 'canceled' && !isAdmin
                //     }, size: 12, Component: () => {
                //         return <div><small>Причина</small>
                //             <pre>{localItem.reason || '-'}</pre>
                //         </div>
                //     }
                // },
            ]}
            onChange={(v) => {
                autoSaveFn && autoSaveFn({...v})
            }}
        ></Smart>
    }

    //console.log('rerender$$$$$$$$$', localItem)
    window.localItem = localItem;
    if (!editQuestion[0]?.tabs[0]?.childs[0].isFin) {
        editQuestion[0].tabs[0].childs.unshift(          {
            config,
            isFinilized,
            lItem: localItem,
            autoSaveFn: props.autoSaveFn,
            isFin: true,
            size: 6, Component: StatusAndReason
        },)
    }
    return <div className="row smData">


        {/*<div className="col-sm-6">*/}
        {/*    <Smart*/}
        {/*        obj={localItem}*/}
        {/*        items={[*/}
        {/*            // {name: 'User', key: 'user', type: 'Number'},*/}
        {/*            // {name: 'Type', key: 'user', },*/}
        {/*            {*/}
        {/*                config,*/}
        {/*                isFinilized,*/}
        {/*                autoSaveFn: props.autoSaveFn,*/}
        {/*                size: 12, Component: StatusAndReason*/}
        {/*            },*/}
        {/*            isAdmin && {*/}
        {/*                size: 12,*/}
        {/*                Component: ({item}) => {*/}
        {/*                    return <>*/}
        {/*                        <div style={{marginTop: '15px'}}>*/}
        {/*                            <Link to={'/theme-question/' + item.question}>Question #{item.question}</Link>*/}
        {/*                            <Link to={'/users/' + item.user}> User #{item.user}</Link>*/}
        {/*                        </div>*/}
        {/*                    </>*/}
        {/*                }*/}
        {/*            },*/}
        {/*            {isVisible: () => isAdmin, type: 'HR', size: 12},*/}
        {/*        ]}*/}

        {/*    ></Smart>*/}
        {/*</div>*/}
        {localItem.duplicateData && <>
            <div className={'col-sm-12'}>
                {!isAdmin && <div>Вы отправили дубликат</div>}
                {isAdmin && <DuplicatePreviewWrap {...props}></DuplicatePreviewWrap>}
            </div>
        </>}
        {!localItem.duplicateData && <>
            {isAdmin && <div className="col-sm-4">
                {config.sel1.map((it, ind) => {
                    return <button key={ind}
                                   onClick={() => {
                                       setFilter({...filter, keyDiff: it.key})
                                   }}
                                   className={'btn btn-xs btn-default ' + (it.key === keyDiff ? 'active' : '')}>
                        {it.name}</button>
                })}
                <div className="ib" style={{marginLeft: '10px'}}>
                    {config.sel2.map((it, ind) => {
                        return <button key={ind}
                                       onClick={() => {
                                           setFilter({...filter, type1: it.key})
                                       }}
                                       className={'btn btn-xs btn-default ' + (it.key === filter.type1 ? 'active' : '')}>{it.name}</button>
                    })}
                </div>

                {type1 === 'preview' && <div className="diff-it">
                    <QuestionDetails woSuggestions={true} showName={true}
                                     question={(props.localItem || {})[key2] || {}}></QuestionDetails>
                </div>}
                {type1 === 'diff' && <DiffSmart key1={keyDiff} key2={key2} {...props} />}
                {type1 === 'source' && <div className="preview-read-only-wrap diff-it"><EditSmart {...props} {...{
                    key2: keyDiff,
                    fields: editQuestionReadOnly
                }} /></div>}
            </div>}
            <div className={isAdmin ? "col-sm-8" : 'col-sm-12'}>
                {isFinilized && <div className="preview-read-only-wrap diff-it"><EditSmart {...props} {...{
                    key2: key2,
                    fields: editQuestionReadOnly
                }} /></div>}
                {!isFinilized && <EditSmart {...{key2, fields: editQuestion}} {...props} />}
            </div>
        </>}
    </div>
}

function deepClone(v) {
    return JSON.parse(JSON.stringify(v))
}

function DuplicatePreviewWrap(props) {
    let [question1, setQuestion1] = useState({})
    let [question2, setQuestion2] = useState({})
    let {localItem, autoSaveFn} = props;
    let details = (localItem || {}).duplicateData || {}

    //console.log("qqqqq localImte", props);
    return <div>
        {/*<Link to={`/find-duplicates?suggestion=${localItem._id}&question1=${details.originalId}&question2=${details.duplicateId}`}>Edit Links</Link>*/}
        <DuplicatePreview
            question1={localItem.populatedOriginal}
            question2={localItem.populatedDuplicated}
            onClose={() => {
                localItem.status = 'approved'
                //console.log("qqqqq close", props, autoSaveFn);

                autoSaveFn(localItem)

            }}></DuplicatePreview>
    </div>

}

function LikeDislike({
                         localItem, onChange, isEqualFn, obj1, obj2, key1, key2, field, fn, name
                     }) {
    obj1 ??= {};
    obj2 ??= {};
    //console.log('JS DETAILS::', obj1, obj2)
    let v1 = fn ? fn(obj1[field]) : obj1[field];
    let v2 = fn ? fn(obj2[field]) : obj2[field];
    v1 = v1 || ''
    v2 = v2 || ''
    let lines = Math.max(v1.length / 50, v2.length / 50, (v1 || '').split('\n').length, (v2 || '').split('\n').length)
    let PER_LINE = 20;
    if (isEqualFn) {
        isEqualFn(v1 == v2, field)
    }

    return <div className="diff-it" key={field + '__' + v2}>

        <small>{name} {(v1 == v2) && <span>:: Без изм.</span>} </small>
        {v1 !== v2 && <>
            <button className="btn btn-xs btn-default"
                    onClick={() => {
                        //console.log("aaaaa!!!!!!!!!!!!!!", { key1, key2, field, localItem })
                        localItem[key2] = localItem[key2] || {};
                        localItem[key2][field] = deepClone((localItem[key1] || {})[field] || '')
                        onChange && onChange(localItem[key2], key2)
                    }}
            >Применить Оригинал
            </button>
        </>}
        {v1 !== v2 && <Editor2 height={lines > 8 ? 270 : lines > 3 ? 80 : 80} v1={v1} v2={v2}
                               onChange={(...args) => {
                                   localItem[key2] = localItem[key2] || {};
                                   localItem[key2][field] = args[0];
                                   onChange && onChange(localItem[key2], key2)
                               }}
        />}
    </div>
}

function DiffSmart(props) {

    //console.log("propssssss444", props)
    function pubList(items) {
        return (items || []).map(it => {
            return `${it.name || ''}:: \n${it.desc} \n${videos(it.videos)}`
        }).join('\n')
    }

    function stringifyShort(data) {

        data ??= {}
        let names = {
            timeout: 'Таймаут на запуск',

            testCasesStr: 'Тест кейсы',
            pubCasesStr: 'Пуб тест кейсы',
            starterFiles: 'Стартер Файлы',
            starter: 'Стартер код',
            returnType: 'Тип ретерн ф-ии',
            originalSolutionStatus: 'Дефолт солюшн статус',
            hideRunStatus: 'Скрыть ран результаты',

            'files.name': 'Файлы',
            'fields.name': 'Поля',
            fnName: 'Файл нейм',
            correctSolution: 'Правильное решение',
            solutionFiles: 'Файлы решения',
            codeType: 'Тип задачи',
            // pubCasesStr: 'Пуб тест кейсы',
        };
        let str = ['timeout', 'testCasesStr', 'pubCasesStr', 'starterFiles', 'starter',
            'solutionFiles', 'returnType', 'originalSolutionStatus', 'hideRunStatus',
            'files.name', 'fields.name',
            'fnName', 'correctSolution', 'solutionFiles', 'codeType'].map(key => {
            let isArrName = key.indexOf('.name') > -1;
            key = isArrName ? key.replace('.name', '') : key;
            let namesArr = (data[key] || []);
            // console.log('namesArr', isArrName, namesArr, key, data[key])
            let rr = (isArrName ? (namesArr.map(it => it.name).join('\n')) : JSON.stringify(data[key], null, 2));
            //console.log("rrrrrrrr", rr)
            if (rr === '{}' || rr === 'undefined' || rr === undefined) {
                rr = ''
            }
            return (names[key] || key) + ':: ' + rr
        }).join('\n\n')
        // console.log("data JS DETAILS", str)

        return str;
        // return new Date().getTime().toString();
        // return JSON.stringify(data, null, 2)
    }

    let {localItem, key1, key2} = props;
    let obj1 = localItem[key1] || {}
    let obj2 = localItem[key2] || {}

    function tagify(arr) {
        let categories = Storage.getCategories();
        return (arr || []).map(it => {
            return (categories[it] || {}).title || ('#' + it)
        }).join('\n')
    }

    function videos(arr) {
        return (arr || []).map(it => {
            return 'video: ' + it.name + ' :: ' + it.href
        }).join('\n')
    }


    let _obj = {
        obj1: obj1,
        obj2: obj2,
        key1: key1,
        key2: key2,
        localItem,
        onChange: props.onChange,
        isEqualFn: !props.onChangeTotalEqual ? null : (value, field) => {
            eqObj[field] = value;
            clearTimeout(eqTimer)
            eqTimer = setTimeout(() => {
                // console.log("eeeeeeee")
                let isEqual = true;
                _.each(eqObj, v => {
                    if (!v) {
                        isEqual = false;
                    }
                })
                props.onChangeTotalEqual && props.onChangeTotalEqual(isEqual, _.size(eqObj), eqObj)

            }, 100)
        }
    }
    return <div className='diffWrapper'>
        <>
            <button className="btn btn-xs btn-default"
                    onClick={() => {
                        localItem[key2] = deepClone((localItem[key1] || {}))
                        props.onChange && props.onChange(localItem[key2], key2)
                    }}
            >Применить оригинал для Всех
            </button>
        </>
        <LikeDislike
            name={'Question Type'}
            field={'type'}
            {..._obj}
        ></LikeDislike>
        <LikeDislike
            name={'Title'}
            field={'title'}
            {..._obj}
        ></LikeDislike>
        <LikeDislike
            name={'Difficulty'}
            field={'difficulty'}
            {..._obj}
        ></LikeDislike>
        <LikeDislike
            name={'Name'}
            field={'name'}
            {..._obj}
        ></LikeDislike>
        <LikeDislike
            {..._obj}

            name={'Tags'}
            field={'hashTags'}
            fn={tagify}
        ></LikeDislike>
        <LikeDislike
            {..._obj}

            name={'Videos'}
            field={'videos'}
            fn={videos}
        ></LikeDislike>
        <LikeDislike
            {..._obj}

            name={'Answer'}
            field={'answer'}
        ></LikeDislike>
        <LikeDislike
            {..._obj}

            name={'UseCases'}
            field={'useCases'}
            fn={pubList}
        ></LikeDislike>
        <LikeDislike
            {..._obj}

            name={'Facts'}
            field={'facts'}
            fn={pubList}
        ></LikeDislike>
        <LikeDislike
            {..._obj}

            name={'Hints'}
            field={'hints'}
            fn={pubList}
        ></LikeDislike>

        {/* <LikeDislike
            name={'quizes'}
            field={'quizes'}
            fn={stringifyShort}
        ></LikeDislike> */}
        <LikeDislike
            {..._obj}

            name={'jsDetails'}
            field={'jsDetails'}
            fn={stringifyShort}
        ></LikeDislike>
    </div>
}

function EditSmart(props) {
    let {onChange, fields, localItem = {}, key2, onGlobalChange} = props || {};
    let obj = localItem[key2] || {}
    return <Smart
        obj={obj}
        items={fields}
        onChange={(v) => {
            //console.log("qqqqq vvvvvv", v, key2, localItem[key2]);
            localItem[key2] = v;
            onChange && onChange(v, key2)
            onGlobalChange && onGlobalChange(localItem)
        }
        }
    ></Smart>
}

function generateSuggestion(questionId) {
    let _id = (questionId || {})._id || questionId;
    //console.log('generate suggestion', _id)
    global.http.get('/generate-suggestion', {question: _id})
        .then(r => {
            global.navigate('/suggestions/' + r._id)
        })
}

function QuizAdminInsideQuestion(props) {
    //console.log("propspropspropsprops", props)
    let {item = {}} = props;
    let [count, setCount] = useState(-1)
    let [open, setOpen] = useState(false)
    let [items, setItems] = useState([]);
    let _id = props.questionId || item.questionId || item._id || (global.localItem || {}).question;
    let questionId = _id;
    useEffect(() => {
        questionId && global.http.get('/load-quizes-by-question', {question: questionId})
            .then(items => {
                setCount(items.length)
            })
    }, [questionId])
    // to={"/quiz-editor/" + _id} 
    //console.log("xxxxxxxxxxxxxxxx memo key888 ")
    return <div className='row'>
        <div className='col-xs-12'>

            <div className='pull-right'>
                {/* <small>{new Date().getTime()}</small> */}
                {global.env.isAdmin && <button className='btn btn-xs btn-primary' onClick={() => {
                    setOpen(true)
                }}>{props.title || 'Конфигуратор квизов'} {count < 0 ? `loading ... #${_id}` : `[x${count}]`}
                </button>}
                {item._id && global.env.isAdmin &&
                    <Link className='btn btn-xs btn-primary' to={'/theme-question/' + item._id} onClick={() => {
                    }}>Open Version Editor #{item._id}
                    </Link>}
            </div>
        </div>
        <div className='col-xs-12'>
            <hr/>
            {open && <MyModal
                isOpen={true}
                size={'full'}
                onClose={() => {
                    setOpen(false)
                }}
            >
                <QuizEditor questionId={_id}
                            setCount={(count) => {
                                setCount(count)
                            }}
                ></QuizEditor>
            </MyModal>}
        </div>
    </div>
}

export default SuggestionItem
export {editQuestion, DiffSmart, QuizAdminInsideQuestion, QuizEditFields, generateSuggestion};
