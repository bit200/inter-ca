import TextField from '@mui/material/TextField';
import React, {useRef, useState, useEffect} from 'react';
import _ from 'underscore';
import {
    Link, Outlet
} from "react-router-dom";
import Select from 'libs/Select'
import Smart from 'libs/Smart'
import Textarea from 'libs/Textarea'
import Input from 'libs/Input'
import MDEditorComp from '../Suggest/MDEditorComp'
import TagSelector from '../Suggest/TagSelector'
import Questions from '../Suggest/QuestionsSelection'
import {ReactSortable} from "react-sortablejs";
import Storage from "../Suggest/CustomStorage";
import UserNewSel from "../Suggest/UserNewSel";
import GroupButton from "../../libs/GroupButton/GroupButton";
import AutoComplete from "../../libs/AutoComplete/AutoComplete";
import Autocomplete, {createFilterOptions} from "@mui/material/Autocomplete";
import CircularProgress2 from "../TrainMethods/Comps/CircularProgress2";
import './Interview.css'
import InterviewItemEditModal from "./InterviewItemEditModal";
import {pub0} from "../../libs/m/m";
import DebugLogs from "../DebugLogs";
import * as PropTypes from "prop-types";
import Button from "../../libs/Button";

let isAdmin = Storage.isAdmin()
let pubName = Storage.pubName;
let videoId;

export function getVideoTime() {
    let el = $('#' + videoId)[0]

    let time = +el?.currentTime || 0;
    let duration = +el?.duration || 0;
    return {
        minutes: Math.floor(time / 60),
        seconds: Math.round(time) % 60,
        durationMinutes: Math.floor(duration / 60),
        durationSeconds: Math.round(duration) % 60,
    }
}

function getQuestionPerc(item) {
    let info = (item?.infoByUsers || {})[global.user.get_id()] || {}
    let lvl = +info.answerLevel;
    console.log("qqqqq zzzzzzzzzzzzzzzzzzzzzzzzzzzz444", item, info);

// && (item.timeMinutesEnd || item.timeSecondsEnd)
    return ((item.name ? 1 : 0) + ((item.timeMinutes || item.timeSeconds) ? 1 : 0) + (info?.hashTags?.length ? 1 : 0) + (lvl ? 1 : 0)) * 100 / 4;

}


function InsertFromExel({localItem}) {
    function text(it) {
        return it ? it.innerHTML : it;
    }

    return <div className="row contenteditable-input o4">
        <div className="col-sm-6">
            <small onClick={() => {
                global.document.querySelector('#table1').innerHTML = ``
            }}>Вставьте блок с вопросами</small>
            <div contentEditable={true} id="table1" onInput={(e) => {
                let el = e.currentTarget.querySelector('table')
                if (!el) {
                    return;
                }
                let categories = Storage.getCategoriesPlain();
                let rows = el.querySelectorAll('tbody tr')
                let questions = [];

                rows.forEach((it, ind) => {
                    let [question, theme, additionalQuestions, time, level, answer] = it.querySelectorAll('td');
                    let name = text(question);
                    let themePlain = text(theme);

                    ((name || '').trim() !== 'Вопрос') && questions.push({
                        name,
                        themePlain,
                        hashTags: _.filter(categories, it => {
                            // console.log("qqqqq category", it);
                            return it.title === themePlain
                        }).map(it => it._id),
                        additionalQuestions: text(additionalQuestions),
                        answerLevel: text(level),
                        timePlain: text(time),
                        detailedAnswer: text(level),
                    })


                })
                localItem.questions = questions;
                global.onChangeCount(new Date().getTime());
                // console.log("qqqqq vvv!!!!", questions);
            }
            }>
            </div>
        </div>
        <div className="col-sm-6">
            <small onClick={() => {
                global.document.querySelector('#table2').innerHTML = ''
            }}>Блок Шапки</small>
            <div contentEditable={true} id="table2" onInput={(e) => {
                //console.log("qqqqq vvвввv", e.currentTarget.innerHTML);
                let el = e.currentTarget.querySelector('table')
                if (!el) {
                    return;
                }
                let row = el.querySelectorAll('tbody tr')[1].querySelectorAll('td');

                // let localItem = {}

                localItem.name = text(row[0])
                localItem.client = text(row[1])
                localItem.position = text(row[2])
                localItem.partner = text(row[3])
                localItem.video = row[4].querySelector('[href]').getAttribute('href')
                localItem.stack = text(row[5])

                global.onChangeCount(new Date().getTime());
                // global.UpdateRootFn();
                //console.log("qqqqq localItem", localItem);
            }
            }>
            </div>
        </div>
        <hr/>
    </div>
}

let pp = {}
let Comp = () => {
    let {props, selId, item, userId, onChangeInfoByUsers} = pp;
    return <div>
        <Sort {...props}
              selId={selId}
              infoByUser={(item?.infoByUsers || {})[userId] || {}}
              onChangeInfoByUsers={onChangeInfoByUsers}
              onChange={(item) => {
                  console.log("qqqqq item ON CHAGNSE!!!!", item);
                  // item ? onChange(item) : onChange()
                  global.autoSaveFn && global.autoSaveFn(item)
              }
              } item={item}></Sort>
    </div>
}
function Interview({props}) {
    const [count, setCount] = useState(0);
    const [open, setOpen] = useState(false);
    const [selId, setSelId] = useState(null)
    //console.log('*.....Interview Render', props);
    let {item, onChange} = props

    global.onChangeCount = setCount;
    let isSale = false;
    let isAdmin = false;


    let userId = global.user.get_id();

    function onChangeInfoByUsers(data) {
        item.infoByUsersInterview = item.infoByUsersInterview || {};
        item.infoByUsersInterview[userId] = {...item.infoByUsersInterview[userId] || {}, ...data}
        global.autoSaveFn && global.autoSaveFn(item)
        console.log("qqqqq propsssssssssssssssssssss SAVE", item, data);
    }

    let localItem = item;
    localItem.questions = localItem.questions || [];
    localItem.totalPerc = Math.round(localItem.questions.reduce((acc, it) => {
        let perc = +getQuestionPerc(it, it?.infoByUsers)
        console.log("qqqqq it444", perc, it);
        return acc + (perc == 100 ? 100 : 0)
    }, 0) / (localItem.questions.length || 1))


    let infoByUsersInterview = (item?.infoByUsersInterview || {})[userId] || {}
    pp = {props, selId, item,userId, onChangeInfoByUsers};
    console.log("qqqqq itemitemitemitemitem", item?.infoByUsersInterview);
    let FooterComp = () => {
        return <div className="col-sm-12 " style={{marginTop: '10px'}}>

            <DebugLogs>
            </DebugLogs>
            <strong>{t('interviewPerc')}: {item?.totalPerc || '-'}%</strong>
            {/*Необходимо заполнить*/}
        </div>
    }



    return <div>

        <div className="row interview-item">
            <div className="col-sm-12">
                {/*<Sort {...props}*/}
                {/*      selId={selId}*/}
                {/*      infoByUser={(item?.infoByUsers || {})[userId] || {}}*/}
                {/*      onChangeInfoByUsers={onChangeInfoByUsers}*/}
                {/*      onChange={(item) => {*/}
                {/*          console.log("qqqqq item ON CHAGNSE!!!!", item);*/}
                {/*          // item ? onChange(item) : onChange()*/}
                {/*          global.autoSaveFn && global.autoSaveFn(item)*/}
                {/*      }*/}
                {/*      } item={item}></Sort>*/}
                <Smart
                    items={[
                        {
                            size: 12,
                            tabs: [
                                {
                                    name: t('questions'), childs: [
                                        {
                                            size: 12,
                                            Component: Comp
                                        }
                                    ]
                                },
                                {
                                    name: t('mainMenu'), childs: [
                                        {
                                            name: 'name',
                                            key: 'name', type: 'input', size: 3},
                                        {
                                            name: 'date',
                                            key: 'date', type: 'date', size: 3,},
                                        {
                                            name: 'type',
                                            key: 'type',
                                            type: 'select',
                                            items: ['', 'HR', 'tech', 'owner', 'partner', 'screening', 'kurators_screening'],
                                            size: 3
                                        },
                                        {name: 'videoLink', size: 3, key: 'video', type: 'input'},
                                    ]
                                },


                                {
                                    name: t('analyse'), childs: [
                                        {
                                            name: t('Overall assessment of the interview'),
                                            key: `infoByUsersInterview.user${global.user.get_id()}.feedback`,
                                            minRows: 4,
                                            type: 'textarea',
                                            size: 4
                                        },
                                        {
                                            Component({item}) {
                                                return <>
                                                    <div>{t('top1mostInteresting')}
                                                        <List3Max
                                                            max={1}
                                                            onClick={setSelId}
                                                            questions={item?.questions || []}
                                                            items={infoByUsersInterview?.interestingQuestions || []}
                                                            onChange={(items) => {
                                                                onChangeInfoByUsers({interestingQuestions: items})
                                                                console.log("qqqqq on Changeeeeeeee",);
                                                            }}></List3Max>
                                                    </div>
                                                </>
                                            },
                                            size: 4,
                                            // type: 'textarea', key: 'bestAsnwers', name: 'Лучшие ответы',
                                            // minRows: 4,
                                        },
                                        {
                                            Component({item}) {
                                                return <>
                                                    <div>{t('top3answers')}
                                                        <List3Max
                                                            onClick={setSelId}
                                                            questions={item?.questions || []}
                                                            items={infoByUsersInterview?.bestAnswers || []}
                                                            onChange={(items) => {
                                                                onChangeInfoByUsers({bestAnswers: items})
                                                                console.log("qqqqq on Changeeeeeeee",);
                                                            }}></List3Max>
                                                    </div>
                                                </>
                                            },
                                            size: 4,
                                            // type: 'textarea', key: 'bestAsnwers', name: 'Лучшие ответы',
                                            // minRows: 4,
                                        },
                                    ]
                                },
                                !(isSale || isAdmin) ? null : {
                                    name: 'Админ', childs: [
                                        {type: 'HR', size: 12,},

                                        {
                                            size: 6, Component: ({item}) => {
                                                return <UserNewSel userId={item.user} onChange={(v, _id) => {
                                                    item.user = _id
                                                    onChange(item)
                                                }
                                                }></UserNewSel>
                                            }
                                        },
                                        {
                                            size: 6, Component: InsertFromExel
                                        },
                                        {type: 'HR', size: 12,},

                                        {
                                            defSize: 4,
                                            size: 6, childs: [

                                                {
                                                    name: 'Статус',
                                                    key: 'status',
                                                    type: 'select',
                                                    items: ['waiting', 'next_stage', 'offer', 'bad']
                                                },
                                                {name: 'Рейт', key: 'rate', type: 'number'},
                                                {name: 'Позиция', key: 'position', type: 'input'},
                                                {name: 'Партнер', key: 'partner', type: 'input'},
                                                {name: 'Компания', key: 'client', type: 'input'},
                                                {name: 'Стек', key: 'stack', type: 'input'},]
                                        },
                                        {
                                            size: 6, childs: [
                                                {
                                                    name: 'Фидбек Клиента',
                                                    key: 'feedback',
                                                    type: 'textarea',
                                                    minRows: 4,
                                                    size: 12
                                                },
                                            ]
                                        }


                                    ]
                                }
                            ],
                            Footer: FooterComp
                        },
                        // {
                        //     size: 12,
                        //     defSize: 3,
                        //     childs: [
                        //         // {
                        //         //     size: 6, defSize: 6, childs: [
                        //         //
                        //         //     ]
                        //         // },
                        //         {name: 'Название', key: 'name', type: 'input', size: 3},
                        //         {name: 'Дата', key: 'date', type: 'date', size: 3,},
                        //         {
                        //             name: 'Тип',
                        //             key: 'type',
                        //             type: 'select',
                        //             items: ['', 'HR', 'tech', 'owner', 'partner', 'screening', 'kurators_screening'],
                        //             size: 3
                        //         },
                        //         {name: 'Видео ссылка', size: 3, key: 'video', type: 'input'},
                        //         {size: 12, type: 'HR'},
                        //         {
                        //             size: 12, Component() {
                        //                 return <div className="col-sm-12">
                        //
                        //                     <DebugLogs>
                        //                     </DebugLogs>
                        //                     <strong>Процент заполненности
                        //                         интервью: {item?.totalPerc}%</strong>
                        //                     {/*Необходимо заполнить*/}
                        //                 </div>
                        //             }
                        //         },
                        //         {size: 12, type: 'HR'},
                        //         {
                        //             name: 'Общая оценка интервью',
                        //             key: `infoByUsersInterview.user${global.user.get_id()}.feedback`,
                        //             minRows: 4,
                        //             type: 'textarea',
                        //             size: 4
                        //         },
                        //         {
                        //             Component({item}) {
                        //                 return <>
                        //                     <div>ТОП-1 вопрос (самый интересный)
                        //                         <List3Max
                        //                             max={1}
                        //                             onClick={setSelId}
                        //                             questions={item?.questions || []}
                        //                             items={infoByUsersInterview?.interestingQuestions || []}
                        //                             onChange={(items) => {
                        //                                 onChangeInfoByUsers({interestingQuestions: items})
                        //                                 console.log("qqqqq on Changeeeeeeee",);
                        //                             }}></List3Max>
                        //                     </div>
                        //                 </>
                        //             },
                        //             size: 4,
                        //             // type: 'textarea', key: 'bestAsnwers', name: 'Лучшие ответы',
                        //             // minRows: 4,
                        //         },
                        //         {
                        //             Component({item}) {
                        //                 return <>
                        //                     <div>ТОП-3 лучших ответа
                        //                         <List3Max
                        //                             onClick={setSelId}
                        //                             questions={item?.questions || []}
                        //                             items={infoByUsersInterview?.bestAnswers || []}
                        //                             onChange={(items) => {
                        //                                 onChangeInfoByUsers({bestAnswers: items})
                        //                                 console.log("qqqqq on Changeeeeeeee",);
                        //                             }}></List3Max>
                        //                     </div>
                        //                 </>
                        //             },
                        //             size: 4,
                        //             // type: 'textarea', key: 'bestAsnwers', name: 'Лучшие ответы',
                        //             // minRows: 4,
                        //         },
                        //         {
                        //             isVisible: () => isSale || isAdmin,
                        //             size: 12,
                        //             defSize: 2,
                        //             childs: [
                        //                 {type: 'HR', size: 12,},
                        //
                        //                 {
                        //                     size: 6, Component: ({item}) => {
                        //                         return <UserNewSel userId={item.user} onChange={(v, _id) => {
                        //                             item.user = _id
                        //                             onChange(item)
                        //                         }
                        //                         }></UserNewSel>
                        //                     }
                        //                 },
                        //                 {
                        //                     size: 6, Component: InsertFromExel
                        //                 },
                        //                 {type: 'HR', size: 12,},
                        //
                        //                 {
                        //                     defSize: 4,
                        //                     size: 6, childs: [
                        //
                        //                         {
                        //                             name: 'Статус',
                        //                             key: 'status',
                        //                             type: 'select',
                        //                             items: ['waiting', 'next_stage', 'offer', 'bad']
                        //                         },
                        //                         {name: 'Рейт', key: 'rate', type: 'number'},
                        //                         {name: 'Позиция', key: 'position', type: 'input'},
                        //                         {name: 'Партнер', key: 'partner', type: 'input'},
                        //                         {name: 'Компания', key: 'client', type: 'input'},
                        //                         {name: 'Стек', key: 'stack', type: 'input'},]
                        //                 },
                        //                 {
                        //                     size: 6, childs: [
                        //                         {
                        //                             name: 'Фидбек Клиента',
                        //                             key: 'feedback',
                        //                             type: 'textarea',
                        //                             minRows: 4,
                        //                             size: 12
                        //                         },
                        //                     ]
                        //                 }
                        //
                        //
                        //             ]
                        //         },
                        //     ]
                        // }


                    ]}
                    defSize={6}
                    obj={item}
                    onChange={(v, _id) => {
                        //console.log("qqqqqon Change", v, _id);
                        setCount(new Date().getTime())
                        global.autoSaveFn && global.autoSaveFn(v)
                    }
                    }></Smart>
                <hr/>
            </div>
            <div className="col-sm-12">

                {/*<Sort {...props}*/}
                {/*      selId={selId}*/}
                {/*      infoByUser={(item?.infoByUsers || {})[userId] || {}}*/}
                {/*      onChangeInfoByUsers={onChangeInfoByUsers}*/}
                {/*      onChange={(item) => {*/}
                {/*          console.log("qqqqq item ON CHAGNSE!!!!", item);*/}
                {/*          // item ? onChange(item) : onChange()*/}
                {/*          global.autoSaveFn && global.autoSaveFn(item)*/}
                {/*      }*/}
                {/*      } item={item}></Sort>*/}

            </div>
        </div>
    </div>
}

function List3Max(props) {
    let {onChange, items, onClick, max = 3, questions} = props
    let _questions = (questions || []).filter(it => it.type != 'pause');

    let _items = [...items || []]
    m.from_to(1, max).map((it, ind) => {
        if (!_items[ind]) {
            _items.push({})
        }
    })

    return <div>
        {(_items || []).map((it, ind) => {
            if (ind > max - 1) {
                return null;
            }
            return (<div key={ind} className={!+it?._id ? 'error' : ''} style={{padding: '2px 5px'}}>

                <div className="rem-x" onClick={() => {
                    items = items.filter((it, _ind) => _ind != ind)
                    onChange(items)
                }}></div>
                <Smart
                    items={[
                        {
                            size: 1, Component() {
                                return <a onClick={() => {
                                    onClick(it?._id)
                                }}>
                                    #{ind + 1}
                                </a>
                            }
                        },
                        {
                            size: 11,
                            type: 'select', items: [
                                {value: '0', name: 'selectQuestion'},
                                ..._questions.map(it => {
                                    return {name: it.name || '-', value: it._id || 0}
                                })], key: '_id'
                        }
                    ]}
                    obj={it}
                    onChange={(v) => {
                        console.log("qqqqq vvv", v);
                        items[ind] = v;
                        onChange(items)
                    }}
                ></Smart>
            </div>)
        })}
    </div>
}


DebugLogs.propTypes = {children: PropTypes.node};

class Sort extends React.Component {
    constructor(props) {
        super(props)
        this.state = {}
    }

    componentDidUpdate(p1) {
        if (p1.selId != this.props.selId) {
            console.log("qqqqq p1.selId::::", p1.selId);
            this.setState({selectedId: +this.props.selId || 0})
        }
    }

    render() {

        let {
            field = {},
            activeInd,
            autoSave,
            localItem,
            onChange,
            setlId,
            onChangeInfoByUsers,
            infoByUser,
        } = this.props;
        let _this = this;
        localItem.questions = localItem.questions || []
        let value = localItem.questions || [];
        this.arr = value;

        function onAdd(cmd) {
            global.http.post('/interview-question', {interview: localItem._id})
                .then(r => {

                    let {minutes, seconds} = getVideoTime()
                    console.log("qqqqq MIN", minutes, seconds);
                    r.timeMinutes = minutes;
                    r.timeSeconds = seconds
                    value[cmd](r);
                    localItem.questions = value;
                    onChange(localItem);
                    _this.setState({selectedId: (r || {})._id})

                })
        }


        let onOpen = () => {
            this.setState({open: true})
        }
        let {ind = 0, selectedId} = this.state;
        if (!selectedId || !(value || []).find(it => it._id == selectedId)) {
            selectedId = ((value || {})[0] || {})._id;
        }
        let userId = global.user.get_id();
        let item = (value || []).find(it => it._id == selectedId);
        let isOwner = localItem.user == global.user.get_id();

        value = _.sortBy(value, it => {
            return ((+it.timeMinutes || 0) * 60) + (+it.timeSeconds || 0)
        })

        let onRemove = (_id) => {
            value = value.filter((it, ind) => it._id != _id)
            localItem.questions = value;
            onChange(localItem)
            console.log("qqqqq on REMOVE",);
        }
        // value = _.uniq(value, it => it._id)

        console.log("qqqqq selected ID", item, selectedId);
        return <div className={'row'}>
            <>

                <DebugLogs>SelectedId: {selectedId}</DebugLogs>
                {/*<div className="col-sm-3 np">*/}

                {/*</div>*/}
                <div className="col-sm-4 np">
                    {/*<CircularProgress2 value={getQuestionPerc(item, isOwner)} zoom={1.5}></CircularProgress2>*/}
                    {/*<hr/>*/}

                    <div
                        style={{marginTop: '0px', marginBottom: '10px'}}

                    >
                        <Button className={'btn btn-xs btn-default btn-push-add'}

                                color={0}
                                size={'sm'}
                                onClick={(cb) => {

                                    onAdd('push')
                                    cb && cb()
                                }}> + {t('newQuestion')}
                        </Button>
                    </div>
                    {value.map((item, _ind) => {
                            let nextItem = value[_ind + 1];
                            let tags = (item.hashTags || []).length;
                            let themeQuestionId = item.themeQuestionId;
                            let isError = !tags || !themeQuestionId;
                            let info = item.infoByUsers || {};
                            let videoDetails = getVideoTime();
                            // item.answerLevel = item.answerLevel || '5'
                            let lvl = (info[userId] || {}).answerLevel || 0
                            console.log("qqqqq itemitemitem", item);
                            let names = [{name: 'Никак', value: '1'},
                                {name: 'Плохо', value: '2'},
                                {
                                    name: 'Не очень',
                                    value: '3'
                                },
                                {name: 'Норм', value: '4'},
                                {name: 'Отлично', value: '5'}].map(it => it.name)


                            let isntPause = item.type !== 'pause'
                            let perc = getQuestionPerc(item, info);
                            return <div key={'value_wrap' + '_' + _ind}
                                        onClick={() => this.setState({selectedId: item._id, item, ind: _ind})}
                                        className={'row  sort-questions np nm draggable-cont interview-items'
                                            + (selectedId == item._id ? ' border-info border-dashed bg-info-subtle ' : '')
                                            + (isError ? ' error-wrap' : '')}>
                                <div className="col-sm-12 np rel">

                                    <div className="ib" style={{paddingLeft: '0'}}
                                         onClick={onOpen}
                                    >
                                        {/*{perc <= 90 && <div className="ib mr-5 pull-left">*/}
                                        {/*    <div className="fa fa-warning" style={{color: 'red'}}></div>*/}
                                        {/*</div>}*/}
                                        <div className={'ib pull-left mr-5'}>
                                            <strong>
                                                <small>{pub0(item.timeMinutes)}:{pub0(item.timeSeconds)}</small></strong><span> - </span>
                                            {nextItem && <strong>
                                                <small>{pub0(nextItem.timeMinutes)}:{pub0(nextItem.timeSeconds)}</small></strong>}
                                            {!nextItem && <strong>
                                                {/*<small>{pub0(videoDetails.durationMinutes)}::{pub0(videoDetails.durationSeconds)}</small>*/}
                                                <small>{t('toEnd')}</small>
                                            </strong>}

                                        </div>
                                        {isntPause && <div className="ib mr-5 pull-left"
                                                           style={{marginTop: '3px', marginRight: '5px'}}>
                                            {/*<div className="ib mr-5">*/}
                                            {/*    <CircularProgress2 value={getQuestionPerc(item, isOwner)}*/}
                                            {/*                       zoom={.75}></CircularProgress2>*/}
                                            {/*</div>*/}
                                            <div className={'ib'} style={{marginTop: '-5px', color: '#7a6fbe'}}>
                                                {/*{perc > 90 && <div className="ib mr-5">*/}
                                                {/*    <div className="fa fa-check"></div>*/}
                                                {/*</div>}*/}

                                                {/*<div className="ib mr-5">*/}
                                                {/*    <div className="fa fa-star-o"></div>*/}
                                                {/*</div>*/}
                                                {/*<div className="ib mr-5">*/}
                                                {/*    <div className="fa fa-heart-o"></div>*/}
                                                {/*</div>*/}
                                            </div>
                                        </div>}
                                        {!isntPause &&
                                            <span><span className="label label-default">Пауза</span></span>}

                                        {isntPause && /task/gi.test(item.type) &&
                                            <span className="pull-left label label-success">Код</span>}

                                    </div>
                                    {isntPause && <div className="w100 ellipse">

                                        {/*{isntPause && <span*/}
                                        {/*    className={"pull-left label " + ((lvl < 4) ? 'label-default' : lvl < 5 ? 'label-default' : 'label-success')}>*/}
                                        {/*        {[lvl] || '---'}*/}
                                        {/*    </span>}*/}
                                        {item.name}
                                    </div>}
                                    <div className="rem-x" onClick={() => {
                                        onRemove(item._id)
                                    }}>
                                        <div className="iconoir-trash"></div>
                                    </div>

                                </div>
                            </div>
                        }
                    )}
                </div>


                <div className="col-sm-8 interviewContent">
                    <VideoPreviewMemo src={localItem?.video}
                                      time={{
                                          minutes: item?.timeMinutes,
                                          seconds: item?.timeSeconds
                                      }}></VideoPreviewMemo>
                    <hr/>
                    <InterviewItemEditModal
                        isOwner={isOwner}
                        selectedId={selectedId}
                        infoByUser={infoByUser}
                        onChangeInfoByUsers={onChangeInfoByUsers}
                        item={item}
                        times={this.state.times}
                        onChange={(item) => {
                            _.each(localItem.questions, (it, ind) => {
                                if (it._id == item._id) {
                                    localItem.questions[ind] = item;
                                }
                            })
                            onChange(localItem)
                        }}></InterviewItemEditModal>
                </div>

            </>
            {/*<MyModal*/}
            {/*    isOpen={open}*/}
            {/*    size={'lg'}*/}
            {/*    onClose={() => {*/}
            {/*        this.setState({open: false})*/}
            {/*    }}*/}
            {/*>*/}
            {/*    <InterviewItemEditModal*/}
            {/*        isOwner={isOwner}*/}
            {/*        item={item} onChange={(item) => {*/}
            {/*        localItem.questions[ind] = item;*/}
            {/*        onChange(localItem)*/}
            {/*    }}></InterviewItemEditModal>*/}
            {/*</MyModal>*/}

        </div>
    }
}


const VideoPreviewMemo = React.memo(function (props) {
    console.log("qqqqq props55555", props);
    return <>
        {/*cd: {new Date().getTime()}*/}
        <VideoPreview {...props}></VideoPreview></>
}, (v1, v2) => {
    //console.log('SMART MEMEO', v1.memo, v2.memo, v2.name)
    return JSON.stringify(v1) == JSON.stringify(v2)
})

function VideoPreview(props) {
    let {src, time} = props;
    let [id, setId] = useState(new Date().getTime())
    let video = useRef()

    videoId = id;
    useEffect(() => {
        if (!video.current) {
            return;
        }
        console.log("qqqqq aaaaaaaaaaaaaaaa", time, video.current);
        onPlay()

    }, [time])

    function onPlay() {
        let _time = +(time.minutes || 0) * 60 + +(time.seconds || 0) + 0
        // if (_time) {
        video.current.currentTime = _time
        video.current.play && video.current.play()
        // }
    }


    if (!src) {
        return <div>
            {/*<div className="iconoir-warn"></div>*/}
            {t('videoNotUploaded')}</div>
    }
    return <>
        <video
            ref={video}
            controls
            src={src} width={'100%'} id={id.toString()}></video>
        {/*<button className={'btn btn-default btn-xs'} onClick={() => {*/}
        {/*    onPlay()*/}
        {/*}}>Воспроизвести с начала*/}
        {/*</button>*/}
    </>
}


function QuestionAutocomplete() {
    let options = Storage.getCategoriesPlain();
    //console.log("qqqqq caaaa", options);
    return <Autocomplete
        multiple
        id="tags-outlined"
        options={options}
        getOptionLabel={(option) => option.title || '--'}
        value={options[0]}
        filterSelectedOptions
        onChange={(r, values) => {
        }
        }
        renderInput={(params) => (
            <TextField
                {...params}
                label=""
                placeholder="Поиск вопроса ..."
            />
        )}
    />
}


export default Interview
