import MDEditorComp from "../Suggest/MDEditorComp";
import Textarea from "../../libs/Textarea/Textarea";
import Input from "../../libs/Input";
import Smart from "../../libs/Smart";
import TagSelector from "../Suggest/TagSelector";
import React from "react";
import {getVideoTime} from "./Interview";

export default function InterviewItemEditModal(props) {
    let {item, times, onChange, isOwner, infoByUser, onChangeInfoByUsers} = props;
    if (!item) {
        return <div>{t('selectQuestion')}</div>
    }
    let userId = global.user.get_id()

    item = item || {}
    item.infoByUsers = item.infoByUsers || {};
    item.infoByUsers[userId] = item.infoByUsers[userId] || {};

    let onChangeInfo = (info) => {
        item.infoByUsers[userId] = info;
        console.log("qqqqq propsssssssssssssssssssss ONCHANGE", item, info);
        onChange(item)
        // infoByUser.byIds[_id] = info
        // onChangeInfoByUsers(infoByUser)
    }
    // let isOwner = item.user == global.user.get_id();
    let info = item.infoByUsers[userId]
    console.log("qqqqq propsssssssssssssssssssss", info, item);


    let isntPause = item.type !== 'pause'
    return <div>
        <div className="row">
            {/*<div className="col-sm-12">*/}
            {/*    <div>*/}
            {/*        <div className="fa fa-star mr-5"></div>*/}
            {/*        ТОП-3 интересный вопрос</div>*/}
            {/*</div>*/}
            {/*<div className={'col-sm-12'}>*/}
            {/*    <div>*/}
            {/*        <div className="fa fa-heart mr-5"></div>*/}
            {/*        ТОП-3 ответ в этом интервью</div>*/}
            {/*</div>*/}
            {/*<div className="col-sm-12">*/}
            {/*    <hr/>*/}
            {/*</div>*/}
            <div className="col-sm-6">
                {/*<div className="col-sm-12 np">*/}
                {/*    <strong><small>Время Старта</small></strong>*/}
                {/*</div>*/}
                <div className="row">
                <div className="col-sm-6 np">
                    <div className="ib">
                        <Input
                            placeholder="minute"
                            type={'number'}
                            value={item.timeMinutes} onChange={(v) => {
                            item.timeMinutes = v;
                            onChange(item)
                        }}></Input>
                    </div>
                </div>
                <div className="col-sm-6 np">

                    <div className="ib">
                        <Input placeholder="seconds"
                               type={'number'}
                               value={item.timeSeconds} onChange={(v) => {
                            item.timeSeconds = v;
                            onChange(item)
                        }}></Input>
                    </div>
                </div>


                {/*<VideoSelector onChange={(v) =>{*/}
                {/*    item.timeMinutes = v.minutes;*/}
                {/*    item.timeSeconds = v.seconds;*/}
                {/*    onChange(item)*/}
                {/*}}></VideoSelector>*/}
                {isntPause && <TagSelector
                    props={{
                        localItem: info,
                        onChange: (value, key) => {
                            info.tags = value
                            // item[key] = value;
                            onChangeInfo(info)
                        }
                    }}

                ></TagSelector>}
                {/*<div className="col-sm-12 np">*/}
                {/*    <strong><small>Время окончания</small></strong>*/}
                {/*</div>*/}
                {/*<div className="col-sm-3 np">*/}
                {/*    <div className="ib">*/}
                {/*        <Input*/}
                {/*            placeholder="Минута"*/}
                {/*            type={'number'}*/}
                {/*            value={item.timeMinutesEnd} onChange={(v) => {*/}
                {/*            item.timeMinutesEnd = v;*/}
                {/*            onChange(item)*/}
                {/*        }}></Input>*/}
                {/*    </div>*/}
                {/*</div>*/}
                {/*<div className="col-sm-3 np">*/}

                {/*    <div className="ib">*/}
                {/*        <Input placeholder="Секунда"*/}
                {/*               type={'number'}*/}
                {/*               value={item.timeSecondsEnd} onChange={(v) => {*/}
                {/*            item.timeSecondsEnd = v;*/}
                {/*            onChange(item)*/}
                {/*        }}></Input>*/}
                {/*    </div>*/}
                {/*</div>*/}
                {/*<VideoSelector></VideoSelector>*/}
                </div>
            </div>
            <div className="col-sm-6">
                {/*<small>Тип вопроса</small>*/}
                <Smart items={
                    [
                        {
                            size: 12,
                            name: 'questionType',
                            key: 'type',
                            type: 'group',
                            list: ['question', 'task', 'js-task', 'pause']
                        }
                    ]
                }
                       obj={item}
                       onChange={(vv) => {
                           item.type = vv.type;
                           onChange(item)
                       }
                       }
                ></Smart>
                {isntPause && <div style={{'marginTop': '5px'}}>
                    {/*<div style={{marginTop: '15px'}}></div>*/}
                    {/*<small>Качество ответа</small>*/}
                    <Smart items={
                        [
                            {
                                size: 12,
                                name: 'answerLevel',
                                key: 'answerLevel',
                                type: 'group',
                                list: [
                                    {name: '-', value: '0'},
                                    {name: '1', value: '1'},
                                    {name: '2', value: '2'},
                                    {
                                        name: '3',
                                        value: '3'
                                    },
                                    {name: '4', value: '4'},
                                    {name: '5', value: '5'}
                                ]
                            }
                        ]
                    }
                           obj={info}
                           onChange={(vv) => {
                               info.answerLevel = vv.answerLevel
                               // item.answerLevel = vv.answerLevel;

                               onChangeInfo(info)
                           }
                           }
                    ></Smart>

                </div>}

            </div>



            <div className={'col-xs-12'} style={{marginTop: '0px'}}>

            </div>

            {isntPause && <>

                <div className="col-sm-12 animChild">
                    <>
                        <div style={{width: '100%', marginTop: '10px'}}>
                            <small className="pull-left">{t('question')}
                                {/*{!isAdmin && <>*/}
                                {/*{item._id && <a href={'/interview-question/' + item._id} className="fa fa-pencil"></a>}*/}
                                {/*/!*{item.date && <a href={'/interview-question/' + item.date}>{item.date}</a>}*!/*/}
                                {/*</>}*/}
                            </small>
                        </div>
                        <MDEditorComp
                            preview={'edit'}
                            value={item.name}
                            rows={4}
                            onChange={(v) => {
                                item.name = v;
                                onChange(item)
                            }}></MDEditorComp>
                        <Textarea minRows="1" placeholder={t('insertAddQuestions')}
                                  value={item.additionalQuestions}
                                  onChange={(e) => {
                                      item.additionalQuestions = e;
                                      onChange(item)
                                  }
                                  }/>
                    </>

                    <>

                        {/*<hr/>*/}
                        {/*<Smart items={*/}
                        {/*    [*/}
                        {/*        {*/}
                        {/*            size: 12,*/}
                        {/*            name: 'Type',*/}
                        {/*            key: 'duplType',*/}
                        {/*            type: 'group',*/}
                        {/*            btnSize: 'xs',*/}
                        {/*            list: [{*/}
                        {/*                name: ' Это Дубликат',*/}
                        {/*                key: 'duplicate'*/}
                        {/*            },*/}
                        {/*                //     {*/}
                        {/*                //     name: 'Дубликат, но не могу найти оригинал',*/}
                        {/*                //     key: 'duplicate2'*/}
                        {/*                // },*/}
                        {/*                {name: ' Это новый вопрос в системе', key: 'newQuestion'},]*/}
                        {/*        }*/}
                        {/*    ]*/}
                        {/*}*/}
                        {/*       obj={item}*/}
                        {/*       onChange={(vv, x) => {*/}
                        {/*           //console.log("qqqqq vvvv", vv, x);*/}
                        {/*           item.duplType = x;*/}
                        {/*           onChange(item)*/}
                        {/*       }*/}
                        {/*       }*/}
                        {/*></Smart>*/}


                        {/*{item.duplType == 'newQuestion' &&*/}
                        {/*    <div className="ib w100">*/}
                        {/*        <TagSelector*/}
                        {/*            props={{*/}
                        {/*                localItem: item,*/}
                        {/*                onChange: (value, key) => {*/}
                        {/*                    item[key] = value;*/}
                        {/*                    onChange(item)*/}
                        {/*                }*/}
                        {/*            }}*/}

                        {/*        ></TagSelector>*/}
                        {/*    </div>}*/}
                        {/*{item.duplType !== 'newQuestion' && <div>*/}
                        {/*    <QuestionAutocomplete></QuestionAutocomplete>*/}
                        {/*</div>}*/}
                    </>

                    {/*<>*/}
                    {/*    <hr/>*/}

                    {/*    /!*<div className="pull-right" style={{marginTop: '0', textAlign: 'right', marginRight: '15px'}}>*!/*/}

                    {/*</>*/}
                    <>
                        {/*<hr/>*/}

                        {/*{isOwner && item.answerLevel !== '5' && <Textarea value={item.detailedAnswerIfIsNotGreat} label=""*/}
                        {/*                                                  placeholder="Работа над ошибками"*/}
                        {/*                                                  minRows={1}*/}
                        {/*                                                  onChange={(e) => {*/}
                        {/*                                                      item.detailedAnswerIfIsNotGreat = e;*/}
                        {/*                                                      onChange(item)*/}
                        {/*                                                  }*/}
                        {/*                                                  }/>}*/}
                        {/*</div>*/}
                        {/*<div className="col-sm-12">*/}
                    </>
                </div>
            </>}
        </div>

    </div>
}

function VideoSelector (props) {
    return  <div className="col-sm-6 videoTimers">
        <small><a onClick={() => {
            let v = getVideoTime();
            props.onChange && props.onChange(v)
        }}>Пулл текущего времени старта из видео</a></small>
        {/*<small><a>12:24</a></small>*/}
        {/*<small><a>12:37</a></small>*/}
    </div>
}

