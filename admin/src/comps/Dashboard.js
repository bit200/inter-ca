import React, {useEffect, useState} from 'react';
import _ from 'underscore';
import Tree from './Tree'
import './dashboard.css'
import Input from 'libs/Input'
import UseLocalStorage from 'libs/UseLocalStorage'
import ProgressBar from './ProgressBar'
import Storage from './Storage'
import Button from 'libs/Button'
import {
    Link, Outlet
} from "react-router-dom";


function DashboardPage(props) {
    let [selectedTags, setSelectedTags] = UseLocalStorage('selectedTags', {});
    let [questions, setQuestions] = useState([]);
    let [historyObj, setHistoryObj] = useState({})
    let [hashTagsStats, setHashTagsStats] = useState({})
    let categories = Storage.getCategoriesPlain();
    let {counts, countsWithTags, byTags} = Storage.getCountsByTags(selectedTags, historyObj, questions)

    useEffect(() => {
        Storage.loadMyQuestions(null, ({questions, history}) => {
            let historyObj = {};
            _.each(history, (item, ind) => {
                historyObj[item.question] = item;
            });

            setQuestions(questions);
            setHistoryObj(historyObj);
            setHashTagsStats(Storage.calcHashTags(questions, historyObj))


        })
    }, [])


    return <div>
        <div className="row">
            <div className="col-sm-12 row">
                {(global.question_statuses || []).map((it, ind) => {
                    return (
                        <div className={'col-sm-3'}>
                            <div key={ind} className={'card-status'}>
                                {it.name}
                                <hr/>
                                {countsWithTags[it.status] || 0}
                                <div>
                                <Link to={'/quiz/' + it.status}>
                                    <Button color={1} size={'xs'}>Тренировать</Button>
                                </Link></div>

                            </div>
                        </div>)
                })}

                <div className="col-sm-12 questions-stats">
                    <div>
                        Изучено: {countsWithTags.perc}%
                    </div>
                    Всего вопросов: {countsWithTags.total}
                    <div></div>
                    На повторении: {countsWithTags.totalRepeat || '-'}
                    <div></div>
                    <Link to={'/quiz/all'}>
                        <Button color={1} size={'xs'}>Начать тренировку</Button>
                    </Link>
                    <ProgressBar item={countsWithTags}></ProgressBar>
                    <hr/>
                </div>

                <div className="col-sm-12">

                    {(categories || []).map((item, ind) => {
                        let stats = byTags[item._id] || {};

                        return (item.parentId !== -1 ? null : <div key={ind} className={''}>
                            <div className="ib inputTags">
                                <Input type="checkbox"
                                       value={selectedTags[item._id]}
                                       onChange={v => setSelectedTags({...selectedTags, [item._id]: v})}
                                />
                            </div>
                            <div className="ib"><Link to={"/quiz/" + item._id}>{item.title || '-'} #{item._id}
                                &nbsp;{stats.perc}% [{stats.total}]
                            </Link>

                            </div>
                            <ProgressBar item={stats}></ProgressBar>
                        </div>)
                    })}
                </div>


            </div>
        </div>


    </div>
}

export default DashboardPage
