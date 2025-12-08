import React, {useState} from 'react';
import CircularProgress2 from "./CircularProgress2";
import Button from "../../../libs/Button";
import Select from "../../../libs/Select";
import {NewPerc} from "../CoursesListOld";
import MyImg from "../../MyImg";
import Skeleton from "../../../libs/Skeleton";


export function getSortedQuestions(questions, key) {
    let keys = {
        auto: 'train',
        train: 'train',
        exam: 'exam',
        lastExam: 'lastExam',
        lastTrain: 'lastTrain',

    }
    key = keys[key] || key || '';

    let fns = {
        notTouched(it) {
            return it.count;
        }
    }
    return _.sortBy(questions, it => {
        if (fns[key]) {
            return fns[key](it)
        }
        return it[key] || 0;
    })

}

export function smartLoad(questions, opts) {
    opts = opts || {}
    let queryOpts = opts.query;
    let {total, logs, shuffleResults, woRemoveEmpty} = opts;

    if (!woRemoveEmpty) {
        questions = questions.filter(it => it.isRead)
    }

    logs && console.log("qqqqq smart load", questions, opts, queryOpts);
    let q = {};
    let res = [];
    let resObj = {};
    let resByKeys = {};

    _.each(queryOpts, (item, key) => {
        q[key] = getSortedQuestions(questions, key)
    })

    let defKey = 'exam'
    q[defKey] = q[defKey] || getSortedQuestions(questions, defKey)

    function tryPush(size, key) {
        if (size < 1) {
            return []
        }
        let arr = [];
        let resSize = 0;
        logs && console.log("qqqqq smart load size", size);
        _.each(q[key], (item, ind) => {
            let _id = item._id;
            if (!resObj[_id] && resSize < size) {
                resObj[_id] = true;
                resSize++;
                res.push(item);
                arr.push(item);
            }
        })
        return arr;
    }

    _.each(queryOpts, (item, key) => {
        let size = item;
        resByKeys[key] = tryPush(size, key)
    })

    resByKeys.default = tryPush(total - res.length, defKey)
    logs && console.log("qqqqq smart load 22", {q, resByKeys, resObj, res});
    logs && console.log("qqqqq smart load 33", res, {shuffleResults});
    return {
        res: shuffleResults ? _.shuffle(res) : res,
        resByKeys, resObj, q,
        originalQuestions: questions, opts
    };
}

function QuestionsList(props) {
    //console.log('*........ ## ROOT RENDER quiestiosnttnsttsntn', props);


    let [sort, setSort] = useState('train');

    let {loading, questionsObj, questions, onClick} = props;
    let _questions = getSortedQuestions(questions, sort).splice(0, 30)

    if (loading) {
        return <Skeleton woLabel={false} count={7} title={t('loading')}></Skeleton>
    }

    return <div className={'animChild'}>

        <div className="tr">
            <button className={'btn btn-sm btn-primary'} onClick={() => {
                props.start && props.start()
            }}>
                <i className="iconoir-sparks">
                </i>
                {t('startRepeat')}
            </button>
            {/*<div className="ib">*/}
            {/*    <small>Сорт: </small>*/}
            {/*</div>*/}
            <div className="ib">
                <Select
                    className={'form-control-sm'}
                    size={'sm'}
                    value={sort}
                    items={[
                        {name: 'sort', value: 'auto'},
                        {name: 'trainPerc', value: 'train'},
                        {name: 'examPerc', value: 'exam'},
                        {name: 'trainDate', value: 'lastTrain'},
                        {name: 'examDate', value: 'lastExam'},
                    ]}
                    onChange={(v) => {
                        //console.log("qqqqq vvvv", v);
                        setSort(v)
                    }}
                ></Select>
            </div>
        </div>

        <div style={{opacity: 0, marginTop: '15px', marginBottom: 0, width: '100%'}}/>
        {/*<div>*/}
        {/*    Вопросы на повторение*/}
        {/*</div>*/}
        <div className="table-responsive">
            <table className="table mb-0">
                <thead className="table-light">
                <tr>
                    <th className="border-top-0">{t('question')}</th>
                    <th className="border-top-0" style={{width: '25%'}}>%</th>
                </tr>
                </thead>
                <tbody className={'animChild'}>
                {(_questions || []).map((v, ind) => {
                    let _id = v._id;
                    return (<tr key={ind}
                                onClick={() => onClick && onClick(v)}
                    >
                        <td><a className="text-primary">{v.title}</a></td>
                        <td
                        >
                            <small className={'text-muted'}>{v.exam}%</small>
                            <NewPerc perc={v.exam}></NewPerc>
                            {/*10853<small className="text-muted">(52%)</small>*/}
                        </td>
                    </tr>)
                })}
                </tbody>
            </table>
        </div>
        {!questions?.length && <>
            <MyImg width={300} top={50} title={'nothingFound'}>404</MyImg>
        </>}
        {/*<div className={'fbList animChild'}>*/}
        {/*    {(_questions || []).map((v, ind) => {*/}
        {/*        let _id = v._id;*/}
        {/*        return (<div key={ind} className={'w100 row qlist'}*/}
        {/*                     onClick={() => onClick && onClick(v)}*/}
        {/*                     style={{width: '100%'}}>*/}
        {/*            <div className="col-sm-3">*/}
        {/*                <div className="ib coursesProgress "*/}
        {/*                     style={{width: '100px', marginRight: '10px'}}>*/}
        {/*                    <small className={'text-muted'}>{v.exam}%</small>*/}
        {/*                    <NewPerc perc={v.exam}></NewPerc>*/}
        {/*                    /!*{v.exam} |*!/*/}
        {/*                    /!*{v.train}*!/*/}
        {/*                    /!*<div className="ib" style={{width: '50%'}}>*!/*/}
        {/*                    /!*    <CircularProgress2*!/*/}
        {/*                    /!*        zoom={.7}*!/*/}
        {/*                    /!*        title={"Практ"} value={v.train} size={20}></CircularProgress2>*!/*/}

        {/*                    /!*</div>*!/*/}
        {/*                    /!*<div className="ib" style={{width: '50%'}}>*!/*/}
        {/*                    /!*    <CircularProgress2*!/*/}
        {/*                    /!*        zoom={.7}*!/*/}
        {/*                    /!*        title={"Экзамен"} value={v.exam} size={20}></CircularProgress2>*!/*/}
        {/*                    /!*</div>*!/*/}

        {/*                </div>*/}
        {/*            </div>*/}
        {/*            <div className="col-sm-9">*/}
        {/*                <div className="w100 ellipse pointer">*/}
        {/*                    {v.title}*/}
        {/*                </div>*/}
        {/*            </div>*/}
        {/*        </div>)*/}
        {/*    })}*/}
        {/*</div>*/}
    </div>
}

export default QuestionsList
