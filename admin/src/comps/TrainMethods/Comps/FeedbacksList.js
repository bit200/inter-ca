import React, {useState, useEffect} from 'react';
import CircularProgress2 from "./CircularProgress2";
import FeedbackReview from "../FeedbackReview";
import Button from "../../../libs/Button";
import Select from "../../../libs/Select";
import {getQuizAnyName} from "../../RunExam";
import {getTitleInfoName} from "../AutoInterview";
import Skeleton from "../../../libs/Skeleton";
import MyImg from "../../MyImg";

function Layout2(props) {
    //console.log('*........ ## ROOT RENDER', props);

    let [filter, setFilter] = useState({});
    let [items, setItems] = useState([]);
    let [stats, setStats] = useState({});

    useEffect(() => {
        // loadFeedbacks();
        // loadFeedbacksStats();

    }, [])
    let translateObj =  {
      //'Методы у промисов': 'Promise Methods',
      //'Аналог promise.all у async await': 'Alternative of promise.all async await',
      //'Не хвавтило пактических примеров': 'Need more practical cases!',
      //'Не хвавтило пактических примеров! Это повторный фидбек - будьте особо внимательны!': 'Need more practical cases!',
      //'Задача по коду: ```jsx console.log([2,2,2,2].map(parseInt)) ```': 'Code Task: ```jsx console.log([2,2,2,2].map(parseInt)) ```',
      //'Молодец, продолжай в том же духе!': 'Perfect! keep up the good work!',
      //'Самая длинная палиндромная подстрока': 'Longest palindromic substring',
      //'Это повторный фидбек - будьте особо внимательны!': 'Need more practical examples',
      //'Необходимо сделать рефактор кода': 'Need to refactor your code!',
      //'Не хватило описания дополнительных алгоритмов решения': 'Need alternative explanations'
    }

    let rate5Comment = (it) => {
        return t('greatWork')
    }
    let getEqualComment = (it) => {
        return t('goodEstimButNeedWork')
    }
    let getNot5 = (it) => {
        return t('needToWork')
    }

    let loadFeedbacksStats = () => {

    }
    let loadFeedbacks = () => {
        global.http.get("/my-feedback-history", {
            filter: {'stats.answerVSadmin': 'less'}
        }).then(r => {
            //console.log("qqqqq rrrrrrr", r);
            setItems(r.items)

        })
    }
    let onClickFb = (fb) => {
        myPlayer({src: ''})
        global.http.get('/quiz-history/' + fb.hist1, {_id: fb.hist1}).then(r => {
            console.log("qqqqq ifnnfofofofofof", r);
            myPlayer({user: r.user, hash: r.hash, text: r.recognition?.recognizedText})
        })
    }


    let getPercNewCount = () => {
        let wrongCount = 0;
        let openCount = 0;
        let time = 0;
        let cd = new Date().getTime();
        let count = (res.fb || []).length || 0;

        let timeCount = 0;


        _.each(res.fb, (item, ind) => {
            let {isOpen, isViewed, answerDetails = {}, stats = {}, adminDetails = {}, reviewDetails = {}} = item;


            if (adminDetails.rate != 5) {
                //console.log("qqqqq item", item);
                time += (reviewDetails?.rate == 5 ? reviewDetails?.cd || cd : cd) - adminDetails.cd
                //console.log("qqqqq time", time, new Date(reviewDetails.cd), new Date(cd));
                timeCount++;
            }

            if (isOpen) {
                openCount++;
            }


            if (stats?.answerVSadmin !== 'equal') {
                wrongCount++;
            }
            //
        })

        return {
            totalCount: count, openCount, perc: Math.round(100 * (count - wrongCount) / (count || 1)),
            time: Math.round((time / (timeCount || 1)))
        }

    }

    let {onClick, fb, onTrain, onChangeFb, res, loading} = props;
    let {perc, totalCount, time, openCount} = getPercNewCount()
    let timeRes = Math.round(time / (60 * 1000))
    // res ??= {}
    // res.fb = []
    if (loading) {
        return <>
            <Skeleton woLabel={false} count={7} title={t('loading')}></Skeleton>
        </>
    }
    return <div>
        {!!openCount && <div>{t('feedsCount')} {openCount} {t('from')} {totalCount}</div>}
        {!!totalCount && !openCount && <div>{t('feedGoodMsg')}</div>}


        {!!time && <div title={t('responseTime')} className={'ib'}>
            <i className="iconoir-alarm"
               style={{marginBottom: '-1px'}}></i> {timeRes > 1000 ? '1000+ ' : (timeRes || 'менее 1 ')}{t('minutesShort')}</div>}
        {!!res?.fb?.length && <div
            className={'ib'}
            style={{marginLeft: '10px'}}
            title={t('percMatching')}>
            {perc}%
        </div>}
        {!!res?.fb?.length && <hr/>}
        {!res?.fb?.length && <div className={'tc'}>
            <div className="imgpadd">
                <MyImg width={300}>404</MyImg>
            </div>
            <h4 className={'imgpadd'}>
                {t('feedMsg')}
            </h4>
        </div>}
        {/*<Select items={['new', 'open', 'all']}></Select>*/}

        <div className="row">
            <div className="col-sm-12">
                <div className={'fbList fbList2 animChild qlist'}>
                    {/*{(items || []).map((it, ind) => {*/}
                    {/*    return (<div key={ind}>*/}
                    {/*        aaaa*/}
                    {/*    </div>)*/}
                    {/*})}*/}

                    {(res.fb || []).map((it, ind) => {
                        let {
                            odb, hist1, isAdmin, stats = {},
                            name, _id, isOpen, isViewed,
                            answerDetails = {}, adminDetails = {}, reviewDetails = {}
                        } = it || {};
                        answerDetails = answerDetails || {}

                        let count = (it.parents || []).length
                        return (<div key={ind}
                                     onMouseEnter={() => {
                                         //console.log("qqqqq change isViewed",);
                                     }}
                        >
                            <div className={'pull-right'}>
                                {!isOpen && !isViewed && <Button
                                    color={0}
                                    size={'sm'} onClick={(cb) => {
                                    cb && cb();
                                    onChangeFb({_id: it._id, isViewed: true})
                                    //console.log("qqqqq Feedback Thanks", it);

                                }}>Спасибо за фидбек!</Button>}
                                <Button
                                    color={isOpen ? 0 : 4}
                                    size={'sm'} onClick={(cb) => {
                                    cb && cb();
                                    //console.log("qqqqq itttttt", it);
                                    onTrain && onTrain({fb: it, quizId: it.quiz})
                                    onChangeFb({_id: it._id, isViewed: true})
                                }}>
                                    <i className="iconoir-spark"></i>
                                    {isOpen ? t('startTrain'): t('startTrainMore')}
                                    </Button>
                            </div>

                            <div onClick={() => {
                                onClickFb(it)
                                //console.log("qqqqq ittttt on click", it);
                            }}>
                                <div style={{marginBottom: '5px'}}>
                                    {!!count && adminDetails?.rate != 5 &&
                                        <div className="badge bg-danger-subtle text-danger">{t('repeating')} !!</div>}
                                    {/*{!isOpen && <div className="label label-success">ok</div>}*/}
                                    {isOpen && <div className="badge bg-danger-subtle text-danger">{t('onWork')}</div>}
                                    {!isViewed && <div className="badge bg-primary-subtle text-primary">{t('newWork')}</div>}
                                    {/*<div className="label label-default">#{_id}</div>*/}
                                </div>

                                <div className={'ellipse w100 pointer'}>
                                    <div className="iconoir-play o3" style={{marginRight: '5px'}}></div>
                                    {/*{name || '-'}*/}
                                    {translateObj[getTitleInfoName(it)] || getTitleInfoName(it)}
                                    {/*{getQuizAnyName(it)}*/}
                                </div>


                                <strong>
                                    <small>

                                        {adminDetails?.growComment && <>
                                            <Comment></Comment>{translateObj[adminDetails?.growComment?.trim('')] || adminDetails?.growComment}</>}
                                        {!adminDetails?.growComment && reviewDetails?.rate != 5 && (adminDetails?.rate == answerDetails?.rate) && adminDetails?.rate != 5 && <>
                                            <Comment></Comment>{getEqualComment(it)}</>}
                                        {!adminDetails?.growComment && reviewDetails?.rate != 5 && (adminDetails?.rate != answerDetails?.rate) && adminDetails?.rate != 5 && <>
                                            <Comment></Comment>{getNot5(it)}</>}
                                        {!adminDetails?.growComment && adminDetails?.rate == 5 && <>
                                            <Comment></Comment>{rate5Comment(it)}</>}
                                    </small>
                                </strong>
                                <div className="pointer" style={{marginBottom: '5px'}}>
                                    <small className="badge bg-dark-subtle text-dark">{t('startRate')}: {answerDetails.rate || '-'}</small>
                                    <small className="badge bg-dark-subtle text-dark">{t('curatorRate')}: {adminDetails.rate || '-'}</small>
                                    <small
                                        className="badge bg-dark-subtle text-dark">{t('reviewRate')}: {reviewDetails.rate || '-'}</small>
                                </div>
                            </div>
                            {res.fb?.length !== (ind + 1) && <hr/>}
                        </div>)
                    })}
                </div>
            </div>
            {/*<div className="col-sm-8">*/}
            {/*  <FeedbackReview fb={fb} onTrain={(v) => {*/}
            {/*   //console.log("qqqqq on Train", v);*/}
            {/*    onTrain(v)*/}
            {/*  }}></FeedbackReview>*/}
            {/*</div>*/}
        </div>

    </div>
}

function Comment() {
    return <span
        className="iconoir-message o5 mr-5" style={{marginTop: '-3px'}}></span>
}


export default Layout2
