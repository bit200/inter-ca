import React, {useEffect, useState} from "react";
import _ from "underscore";
import "./CoursesList.css";
import {Link, Outlet} from "react-router-dom";
import Button from "libs/Button";
import TrainPageCourse from "./TrainPageCourse";
import m from "../../libs/m/m";
import AutoInterview from "./AutoInterview";
import FeedbackReview from "./FeedbackReview";
import Courses from "./Comps/Courses";
import CircularProgress2 from "./Comps/CircularProgress2";
import QuestionsList, {smartLoad} from "./Comps/QuestionList";
import FeedbacksList from "./Comps/FeedbacksList";
import TopStats from "./Comps/TopStats";
import Interviews from "./Comps/Interviews";
import WorkSessions from "./Comps/WorkSessions";
import Statistics from "./Comps/Statistics";
import {
    createAutoInterview,
    getAllQuestions,
    getDBQuizes,
    getSortedQuizesByQuestion, getTopStatsNew,
    getTotalStats,
    sortFn
} from "./Comps/mainMethods";
import {stopAnyPlay} from "../../App";
import {recognitionInit, recognitionStart, recognitionStop} from "./AudioShort/AudioShort";
import Skeleton from "../../libs/Skeleton";
import SemiCircle from "./Comps/SemiCircle";
import {UserImg} from "../Header/Header1";

function getRecentlyOpenCd(it) {
    let _id = it?._id || it || -1;
    let items = Storage.get('lastOpenItems') || []
    let item = items.find(it => it._id == _id)

    return item?.cd || 0;
}

let promoImgs = ['i1.jpeg', 'i2.jpeg', 'i3.png', 'i4.png',
    'i1.jpeg', 'i2.jpeg', 'i3.png', 'i4.png',
    'it.png']
// {name: t('toRepeat'), key: 'ql'},
// {name: t('feedbacks'), key: 'fb'},
// {name: t('courses'), key: 'cl'},
// {name: t('mockInterviews'), key: 'inter'},
// {name: t('stats'), key: 'st'},
function Layout2(props) {
    let [loading, setLoading] = useState(false);
    let [courses, setCourses] = useState([]);
    let [interview, setInterview] = useState(null);
    let [interviewModal, setInterviewModal] = useState(null);
    let [fb, setFb] = useState(null);
    let [res, setRes] = useState({});
    let [open, setOpen] = useState(false);
    let [history, setHistory] = useState({});
    let [modalOpts, setModalOpts] = useState({});
    let [qhistory, setQHistory] = useState({});
    let [visibleQuestions, setVisibleQuestions] = useState([]);
    let [visibleQuestionsObj, setVisibleQuestionsObj] = useState({});
    let [questions, setQuestions] = useState([]);
    let [questionsObj, setQuestionsObj] = useState({});
    // let [tab, setTab] = useState('fb');
    let [tab, setTab] = useState('fb');
    let [res2, setRes2] = useState({})
    let [res3, setRes3] = useState({})
    let [loading2, setLoading2] = useState(true)
    let [loading3, setLoading3] = useState(true)
    let [imgInd, setImgInd] = useState(Math.floor(Math.random() * promoImgs?.length - 1 + 1))


    let isLocal = false;//window.location.href.indexOf('localhost:') > -1;
    console.log("qqqqq visibleQuestionsvisibleQuestions", visibleQuestions, visibleQuestionsObj);
    useEffect(() => {
        reloadAll()
        // recognitionInit()
        // recognitionStart(() => {
        //     console.log("qqqqq titlttl REC START EDDDDDDDDDDD");
        //     recognitionStop()
        // }, () => {
        //     console.log("qqqqq titlttl REC START COMPLLLLLLL");
        // })
    }, []);

    console.log("qqqqq rrrrrrrrrrrrrrrrrrrrrraaaaaaaaaaaaaaaaaaaaaaaaa", res, res2, res3);

    function reloadAll() {
        setLoading(true)
        setLoading2(true)
        setLoading3(false)
        stopAnyPlay('reload All')
        global.http.get("/load-my-courses-details-top-stats").then((r) => {
            setRes2(r)
            setLoading2(false)
        })
        global.http.get("/load-my-courses-details-fb").then((r) => {
            setRes3(r)
            setLoading3(false)
        })
        global.http.get("/load-my-courses-q").then((r) => {
            let {courses, userCourses, questionIds} = r;
            setRes(r);
            setCourses(courses);
            let history = userCourses.reduce((acc, it) => ({...acc, [it.course]: it}), {});
            setHistory(
                history
            );
            let qhistory = {}
            _.each(history, (it, ind) => {
                _.each(it.qHistory, (item, _id) => {
                    qhistory[_id] = qhistory[_id] || {}

                    qhistory[_id].isRead = qhistory[_id].isRead || (item.status == 'ok')
                })
            })

            let {calcQuestion = {}} = r.result || {};
            let questions = ((r.result || {}).questions || []).map(it => {
                return {...it, ...calcQuestion[it._id] || {}, isRead: !!qhistory[it._id]?.isRead}
            });


            let _questionsObj = questions.reduce((acc, it) => ({
                ...acc, [it._id]: {
                    ...it
                }
            }), {});
            let visibleQuestions = questions.filter(it => it.isRead);
            let visibleQuestionsObj = visibleQuestions.reduce((acc, it) => {
                return {...acc, [it._id]: true}
            }, {});
            setQHistory(qhistory)
            setVisibleQuestions(visibleQuestions)
            setVisibleQuestionsObj(visibleQuestionsObj)
            setQuestions(questions)
            setQuestionsObj(_questionsObj)
            setLoading(false)

        });
    }


    //console.log("qqqqq questinosojb", questionsObj, history);

    function clickInterview(interview) {
        setInterview(interview)
        //console.log("qqqqq interivew", interview);
    }

    function clickFeedback(fb) {
        setFb(fb)
        //console.log("qqqqq click fb", fb);
        // global.http

    }


    console.log("qqqqq resresresresres", res);

    async function clickQuestion(item, key) {
        smartClick([item], {total: 7, isExam: false})
        // setOpen(true);
        // setModalOpts({loading: true, quizes: []})
        // let {_id} = item || {};
        // let {quizes, generalQuiz} = (res, _id, key, 5);
        // let dbQuizes = await getDBQuizes(quizes)
        // setModalOpts({loading: false, onQuestion: true, quizes: dbQuizes})

        //console.log("qqqqq quizes!! 1", quizes.map(it => it?.calc));
        //console.log("qqqqq quizes!! 2", dbQuizes);
        // let gQuiz = generalQuiz || await loadGeneralQuiz({_id});
    }

    async function clickExam(questions = [], size = 7) {
        // clickCourse(questions || getAllQuestions(), 'exam', size || 10)
    }

    async function clickCourse(questions = []) {
        console.log("qqqqq smartClicksmartClicksmartClick", questions);
        smartClick(questions, {total: 7})
    }

    async function smartClick(questions = [], opts) {
        let {
            total,
            key,
            isExam,
            qSize = 1,
            query,
        } = opts || {};
        let sortKey = opts.sortKey || isExam ? 'nextCd' : 'nextCd'
        let questionsObj = questions.reduce((acc, it) => ({...acc, [it._id || it]: true}), {})

        let {result, userCourses} = res || {};
        let {calcQuestion, questionsWithQuizes, calcQuiz = {}} = result || {};
        // let visibleQuestionsObj = userCourses.reduce((acc, it, ind) => {
        //     return {...acc, ...it.qHistory || {}}
        // }, {})
        // let visibleQuestions = questions.filter(it => (visibleQuestionsObj[it._id] || {})?.status == 'ok')
        console.log("qqqqq quiestions 00", questionsWithQuizes);

        function isNotInQList(key) {
            return !questionsObj[key]
        }

        let allQuizes = Object.keys(questionsWithQuizes).reduce((acc, key) => {
            if (isNotInQList(key)) {
                return acc;
            }
            let it = questionsWithQuizes[key] || []
            return [...acc, ...it.map(it => {
                return {...it, question: key, ...calcQuiz[it._id] || {}}
            })]
        }, [])

        let sortedAllQuizes = _.sortBy(allQuizes, (it) => {
            let cd = it.nextCd || 0;

            let v = cd || getRecentlyOpenCd(it) || 0;
            return isExam ? v : cd;
        });
        console.log("qqqqq allQuizesallQuizesallQuizes", isExam, questionsWithQuizes, questionsObj, questions, allQuizes);

        let orders = {}
        _.each(sortedAllQuizes, (item, ind) => {
            let questionId = item.question;
            orders[questionId] = orders[questionId] || 0;
            item.order = ++orders[questionId]
        })

        // console.log("qqqqq quiestions 0", visibleQuestions, res);
        // // let grouppedQuizes = _.groupBy(calcQuiz, 'question')
        // console.log("qqqqq quiestions 2", {calcQuestion, calcQuiz});
        console.log("qqqqq quiestions 3", sortedAllQuizes.map(it => it.nextCd));
        console.log("qqqqq quiestions 3", sortedAllQuizes.map(it => it._id));


        let days = 1000 * 24 * 3600;
        let _lastCd = Math.round((new Date().getTime() - 1 * days) / 1000)

        function insertIterations(sortedAllQuizes, {total = 9, quizes = [], order = 1, alreadyQuizes = {}}) {
            let localQuestions = {}
            _.each(sortedAllQuizes, (item, ind) => {
                let {_id, question, order, lastCd} = item;
                if (
                    _lastCd > lastCd &&
                    visibleQuestionsObj[question] && order == 1 && !alreadyQuizes[_id] && !localQuestions[question] && quizes.length < total) {
                    quizes.push(item)
                }
            })
            _.each(sortedAllQuizes, (item, ind) => {
                let {_id, question, order} = item;

                if (visibleQuestionsObj[question] && !alreadyQuizes[_id] && quizes.length < total) {
                    quizes.push(item)
                }
            })
            return quizes;
        }

        let filteredQuizes = insertIterations(sortedAllQuizes, {total})
        console.log("qqqqq quiestions 3.5", filteredQuizes);
        setModalOpts({loading: true, quizes: []})
        setOpen(true)

        let dbQuizes = await getDBQuizes(filteredQuizes)
        console.log("qqqqq quiestions 4", dbQuizes);


        // function extractIterations () {
        //
        // }
        //


        // console.log("qqqqq quiestions 1", grouppedQuizes);


        //
        //  let vv = smartLoad(questions, opts)
        //  let visibleQuestions = vv.res;
        //
        //  // setOpen(true);
        //  let key = isExam ? 'exam' : 'train';
        //
        //
        //  let v = visibleQuestions.map(it => {
        //      return getSortedQuizesByQuestion(res, it, key, qSize)
        //  })
        //  let quizesPlain = _.sortBy(v.reduce((acc, it) => {
        //      return [...acc, ...it.quizes]
        //  }, []), sortFn(key)).splice(0, total)
        // //console.log("qqqqq quizes Plain 0", visibleQuestions.map(it => it._id), visibleQuestions.map(it => it[key]), key);
        // //console.log("qqqqq quizes Plain 1", vv, {visibleQuestions}, visibleQuestions.map(it => ({
        // //      name: it.name,
        // //      _id: it._id,
        // //      [key]: it[key]
        // //  })));
        // //console.log("qqqqq quizes Plain 2", quizesPlain.map(sortFn(key)), quizesPlain, key, v);
        //
        //  let dbQuizes = await getDBQuizes(quizesPlain)
        //  console.log("qqqqq VISIBLE QUSEITONS", {opts, dbQuizes, visibleQuestions, v, quizesPlain});
        //
        let autoInterview;

        if (isExam && dbQuizes?.length) {
            autoInterview = await createAutoInterview({
                quizes: dbQuizes.map(it => it?.item?._id),
                questions: dbQuizes.map(it => it?.opts?.question),
            })
            _.each(dbQuizes, (item, ind) => {
                item.opts = item.opts || {};
                item.opts.autoInterview = autoInterview._id
            })

            //console.log("qqqqq auto Interivew", autoInterview);
        }

        setModalOpts({loading: false, quizes: dbQuizes, isExam, autoInterview})

    }


    let onTrainFeedback = async (props) => {
        let {fb, hist, quizId} = props;
        console.log("qqqqq props", props);
        let dbQuizes = await getDBQuizes([{_id: quizId || hist?.quiz}])
        _.each(dbQuizes, (item, ind) => {
            item.opts = item.opts || {};
            item.opts.parentFB = fb._id;
        })
        setModalOpts({loading: false, quizes: dbQuizes, isExam: false})
        setOpen(true)

        //console.log("qqqqq db Quizes44444", dbQuizes);

    }


    let onTrainInterview = async (_id) => {
        //console.log("qqqqq it on train Interivew", _id);
        let dbQuizes = await getDBQuizes([{_id}])
        _.each(dbQuizes, (item, ind) => {
            item.opts = item.opts || {};
            item.opts.parentFB = fb._id;
        })
        setModalOpts({loading: false, quizes: dbQuizes, isExam: false})
        setOpen(true)

        //console.log("qqqqq db Quizes44444", dbQuizes);

    }

    let changeFb = (v) => {
        _.each(res.fb, (item, ind) => {
            if (item._id == v._id) {
                let vv = {...item, ...v};
                res.fb[ind] = vv;
                global.http.put("/feedback-history", vv).then(r => {
                    //console.log("qqqqq upDtedddddd", );
                })
            }
        })
        setRes({...res})
        return v;
    }

    let AutoInterviewWrap = (props) => {
        let _interview = props?.opts?.autoInterview || interview;
        return <AutoInterview interview={_interview}></AutoInterview>
    }

    smartLoad(questions, {
        total: 7,
        query: {train: 2, exam: 3},
        logs: true,
        shuffleResults: true, woRemoveEmpty: true
    })
    let totalStats = getTotalStats({res, history});
    let topStatasNew = getTopStatsNew({res: res2});

    interview = interview || (res.interviews || {})[0];
    fb = fb || (res.fb || {})[0];

    let TrainExam = {
        onClickExam: () => {
            smartClick(questions, {
                isExam: true,
                total: 5,
                // query: {
                //     audio: 3,
                //     code: 4,
                //     total: 8,
                // }
            })
        },
        onClickTrain: () => {
            smartClick(questions, {
                total: 3,
                // query: {
                //     audio: 3,
                //     code: 4,
                //     total: 8,
                // }
            })
        }
    }
    return (
        <div style={{margin: "0"}} className={'courseWrap ' + (loading ? 'courseLoading' : '')}>
            <MyModal
                isOpen={interviewModal}
                onClose={() => {
                    setInterviewModal(false)
                    reloadAll();
                }}
                size={'lg'}>
                <h2>Результаты Мок-Интервью</h2>
                <hr/>
                <AutoInterview interview={interview}
                               onClick={(_id) => {
                                   //console.log("qqqqq interview555 on Train", _id);
                                   clickQuestion({_id}, 'train')
                                   // smartClick(questions, {
                                   //     query: {train: 1}
                                   // })
                               }}
                ></AutoInterview>
            </MyModal>
            <MyModal
                isOpen={open}
                onClose={() => {
                    //console.log("qqqqq on Close!!!!!", );
                    setOpen(false)
                    reloadAll();
                }}
                size={'sm'}>
                <TrainPageCourse
                    onResult={() => {
                        if (!modalOpts.autoInterview) {
                            setOpen(false)
                        }
                        if (modalOpts.autoInterview) {
                            //console.log("qqqqq ON RESULTTTTTTTTTT", modalOpts.autoInterview);
                            setInterviewModal(true)
                            setOpen(false)
                            setInterview(modalOpts.autoInterview)
                        }
                        reloadAll();

                    }}
                    Result={modalOpts.autoInterview ? AutoInterviewWrap : null}
                    onChange={(quizHistory) => {
                        console.log("qqqqq quiz histoyr", quizHistory);
                    }}
                    opts={modalOpts}
                />
            </MyModal>


            <div className="row">
                <div className="col-sm-9 animChild">
                    <div className="card">
                        <div className="card-body">
                            <div className="row animChild">
                                <div className="col-lg-4 align-self-center mb-3 mb-lg-0">
                                    <div className="d-flex align-items-center flex-row flex-wrap">
                                        <div className="position-relative me-3">

                                            <Link to="/profile" className="profile-circle">
                                                {/*<div className="icofont-user rounded-circle"></div>*/}
                                                {/*<div className="iconoir-user rounded-circle"></div>*/}
                                                <UserImg></UserImg>
                                                {/*<img src="assets/images/users/avatar-7.jpg" alt="" height="120"*/}
                                                {/*     className="rounded-circle"/>*/}
                                                <Link to="/profile"
                                                      className="thumb-md justify-content-center d-flex align-items-center bg-primary text-white rounded-circle position-absolute end-0 bottom-0 border border-3 border-card-bg">
                                                    {/*<i className="fas fa-camera"></i>*/}
                                                    {/*<div className="iconoir-camera"></div>*/}
                                                    <div className="iconoir-edit"></div>
                                                </Link>
                                            </Link>
                                        </div>
                                        <div className="">
                                            <h5 className="fw-semibold fs-22 mb-1">{user.get_public_name()}</h5>
                                            <p className="mb-0 text-muted fw-medium">{user.get_position()}</p>
                                        </div>
                                    </div>
                                </div>


                                <div className="col-lg-5 ms-auto align-self-center">
                                    <div className="d-flex justify-content-center">
                                        <div
                                            className="rel border-dashed rounded border-theme-color p-2 me-2 flex-grow-1 flex-basis-0">
                                            {loading2 && <Skeleton count={1} abs={true}></Skeleton>}
                                            <h5 className="fw-semibold fs-22 mb-1">{topStatasNew?.courses || '-'}</h5>
                                            <p className="text-muted mb-0 fw-medium">
                                                {lng == 'ru' && <>Курс{endWord('ов', topStatasNew.courses)}</>}
                                                {lng == 'de' && <>{t('course')}{endWord2('e', topStatasNew.course)}</>}
                                                {lng == 'es' && <>{t('course')}{endWord2('s', topStatasNew.course)}</>}
                                                {lng == 'en' && <>{t('course')}{endWord2('s', topStatasNew.course)}</>}
                                                {lng == 'fr' && <>{t('course')}{endWord2('', topStatasNew.course)}</>}
                                            </p>
                                        </div>
                                        <div
                                            className="rel border-dashed rounded border-theme-color p-2 me-2 flex-grow-1 flex-basis-0">
                                            {loading2 && <Skeleton count={1} abs={true}></Skeleton>}

                                            <h5 className="fw-semibold fs-22 mb-1">{topStatasNew.modules || '-'}</h5>
                                            <p className="text-muted mb-0 fw-medium">
                                                {lng == 'ru' && <>Модул{endWord('ей', topStatasNew.modules)}</>}
                                                {lng == 'de' && <>{t('module')}{endWord2('e', topStatasNew.modules)}</>}
                                                {lng == 'es' && <>{t('module')}{endWord2('s', topStatasNew.modules)}</>}
                                                {lng == 'en' && <>{t('module')}{endWord2('s', topStatasNew.modules)}</>}
                                                {lng == 'fr' && <>{t('module')}{endWord2('s', topStatasNew.modules)}</>}

                                            </p>
                                                {/*<p className="text-muted mb-0 fw-medium">Модул{endWord('ей', topStatasNew.modules)}</p>*/}
                                        </div>

                                        <div
                                            className="rel border-dashed rounded border-theme-color p-2 me-2 flex-grow-1 flex-basis-0">
                                            {loading2 && <Skeleton count={1} abs={true}></Skeleton>}

                                            <h5 className="fw-semibold fs-22 mb-1">{topStatasNew.questions || '-'}</h5>
                                            <p className="text-muted mb-0 fw-medium">
                                                {lng == 'ru' && <>Топик{endWord('ов', topStatasNew.questions)}</>}
                                                {lng == 'de' && <>{t('topic')}{endWord2('n', topStatasNew.questions)}</>}
                                                {lng == 'es' && <>{t('topic')}{endWord2('s', topStatasNew.questions)}</>}
                                                {lng == 'en' && <>{t('topic')}{endWord2('s', topStatasNew.questions)}</>}
                                                {lng == 'fr' && <>{t('topic')}{endWord2('s', topStatasNew.questions)}</>}

                                            </p>
                                        </div>

                                    </div>
                                </div>
                                <div className="col-lg-3 ms-auto align-self-center">
                                    <div className="row">
                                        <div className="col-sm-12 align-self-center">
                                            {loading2 && <Skeleton count={1} abs={true}></Skeleton>}

                                            <SemiCircle
                                                title={t('completionPerc')}
                                                value={topStatasNew?.perc} zoom={2.8}></SemiCircle>
                                            {/*<CircleProgress></CircleProgress>*/}
                                        </div>
                                        {/*<div className="col-sm-6 align-self-center text-center text-center">*/}
                                        {/*    <Link to={'/courses'} type="button" className="btn btn-light">*/}
                                        {/*        <i className="iconoir-arcade"></i>*/}
                                        {/*        <br/>*/}
                                        {/*        Продложить подготовку*/}
                                        {/*    </Link>*/}
                                        {/*</div>*/}
                                    </div>
                                    {/*<div className="d-flex justify-content-center">*/}

                                    {/*    <div*/}
                                    {/*        className="rel border-dashed rounded border-theme-color p-2 me-2 flex-grow-1 flex-basis-0">*/}
                                    {/*        {loading2 && <Skeleton count={1} abs={true}></Skeleton>}*/}

                                    {/*        <h5 className="fw-semibold fs-22 mb-1">{topStatasNew.modules || '-'}</h5>*/}
                                    {/*        <p className="text-muted mb-0 fw-medium">Модулей</p>*/}
                                    {/*    </div>*/}
                                    {/*    <div*/}
                                    {/*        className="rel border-dashed rounded border-theme-color p-2 me-2 flex-grow-1 flex-basis-0">*/}
                                    {/*        {loading2 && <Skeleton count={1} abs={true}></Skeleton>}*/}

                                    {/*        <h5 className="fw-semibold fs-22 mb-1">{topStatasNew.questions || '-'}</h5>*/}
                                    {/*        <p className="text-muted mb-0 fw-medium">Вопросов</p>*/}
                                    {/*    </div>*/}
                                    {/*    <div*/}
                                    {/*        className="rel border-dashed rounded border-theme-color p-2 me-2 flex-grow-1 flex-basis-0">*/}
                                    {/*        {loading2 && <Skeleton count={1} abs={true}></Skeleton>}*/}

                                    {/*        <h5 className="fw-semibold fs-22 mb-1">{topStatasNew.perc}%</h5>*/}
                                    {/*        <p className="text-muted mb-0 fw-medium">Пройдено</p>*/}
                                    {/*    </div>*/}
                                    {/*</div>*/}
                                </div>

                            </div>
                        </div>
                    </div>

                    <ul className="nav nav-tabs mb-3" role="tablist">
                        {([
                            {name: t('toRepeat'), key: 'ql'},
                            {name: t('feedbacks'), key: 'fb'},
                            {name: t('courses'), key: 'cl'},
                            {name: t('mockInterviews'), key: 'inter'},
                            {name: t('stats'), key: 'st'},
                        ] || []).map((it, ind) => {
                            return (<li className="nav-item" role="presentation" key={ind}
                                        onClick={() => {
                                            setTab(it.key)
                                        }}
                            >
                                <a className={"nav-link fw-medium " + (it.key === tab ? 'active' : '')}
                                   data-bs-toggle="tab"
                                   role="tab"
                                   aria-selected="true">{it.name}</a>
                            </li>)
                        })}

                    </ul>
                    {tab == 'fb' && <div className="card">
                        <div className="card-body animChild">
                            <FeedbacksList
                                onClick={clickFeedback}
                                onTrain={onTrainFeedback}
                                onChangeFb={changeFb}
                                fb={fb}
                                res={res3}
                                loading={loading3}
                            ></FeedbacksList>
                        </div>
                    </div>}
                    {tab == 'other' && <TopStats
                        {...TrainExam}
                        totalStats={totalStats}
                    ></TopStats>}
                    {tab == 'ql' && <div className="card">
                        <div className="card-body  animChild">
                            <QuestionsList
                                start={TrainExam.onClickTrain}
                                questionsObj={questionsObj}
                                history={history}
                                loading={loading}
                                onClick={clickQuestion}
                                questions={visibleQuestions}
                            ></QuestionsList>
                        </div>
                    </div>}
                    {tab == 'cl' && <div className="card">
                        <div className="card-body animChild">
                            <Courses
                                res={res}
                                history={history}
                                onClick={clickCourse}
                                courses={courses}
                                loading={loading}
                            ></Courses>
                        </div>
                    </div>}

                    {tab == 'inter' && <div className={'card'}>
                        <div className={'card-body'}>

                            <Interviews
                                start={TrainExam.onClickExam}
                                res={res}
                                onTrain={onTrainInterview}
                                loading={loading}
                                onClick={(interview) => {
                                    //console.log("qqqqq nothing here", interview);
                                    setInterviewModal(true)
                                    setInterview(interview)
                                }}></Interviews>
                        </div>
                    </div>}
                    {tab == 'st' &&
                        <div className="card">
                            <div className="card-body">
                                <Statistics
                                    loading={loading}
                                    res={res}
                                ></Statistics>
                            </div>
                        </div>}

                </div>
                <div className="col-sm-3 sticky3 animChild">
                    {/*<div className="card">*/}
                    {/*    <div className="card-body">*/}
                    {/*        */}
                    {/*    </div>*/}
                    {/*</div>*/}
                    {/*<div className="card">*/}
                    {/*    <div className="card-body">*/}
                    {/*        <div className="row">*/}
                    {/*            <div className="col-sm-6 align-self-center">*/}
                    {/*                {loading2 && <Skeleton count={1} abs={true}></Skeleton>}*/}

                    {/*                <SemiCircle*/}
                    {/*                    value={topStatasNew?.perc} zoom={2.8}></SemiCircle>*/}
                    {/*                /!*<CircleProgress></CircleProgress>*!/*/}
                    {/*            </div>*/}
                    {/*            <div className="col-sm-6 align-self-center text-center text-center">*/}
                    {/*                <Link to={'/courses'} type="button" className="btn btn-light">*/}
                    {/*                    /!*<i className="iconoir-double-check"></i>*!/*/}
                    {/*                    /!*<br/>*!/*/}
                    {/*                    Продложить подготовку*/}
                    {/*                </Link>*/}
                    {/*            </div>*/}
                    {/*        </div>*/}
                    {/*    </div>*/}
                    {/*</div>*/}
                    <div className="card">
                        <div className="card-body">
                            <>
                                {loading && <Skeleton count={3} abs={true}></Skeleton>}
                                <div className="row d-flex justify-content-center border-dashed-bottom pb-3">
                                    <div className="col-lg-8">
                                        <p className="text-dark mb-0 fw-semibold fs-14">{t('trains')}</p>
                                        <h3 className="mt-2 mb-0 fw-bold"> {(totalStats.trainNotNullAvgRate / 20).toFixed(1)}</h3>
                                    </div>
                                    <div className="col-lg-4 align-self-center tr">
                                        <div
                                            className="d-flex justify-content-center align-items-center thumb-xl bg-light rounded-circle mx-auto">
                                            <i className="iconoir-percentage-circle h1 align-self-center mb-0 text-secondary"></i>
                                        </div>
                                    </div>
                                </div>
                                <div className="pull-right " style={{marginTop: '15px'}} onClick={() => {
                                    TrainExam.onClickExam()
                                }}>
                                    <div className="btn btn-light btn-sm">
                                        <i className="iconoir-sparks"></i>
                                        {t('startTrain')}
                                    </div>
                                    {/*<a href="">Тренировать</a>*/}
                                </div>
                                <p className="mb-0 text-truncate text-muted mt-3 statsListHead"><span
                                    className="text-success">{totalStats.exam100}%</span>
                                    {t('on5')}</p>
                            </>
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-body">
                            {loading && <Skeleton count={3} abs={true}></Skeleton>}
                            <div className="row d-flex justify-content-center border-dashed-bottom pb-3">
                                <div className="col-lg-8">
                                    <p className="text-dark mb-0 fw-semibold fs-14">{t('mockInterviews')}</p>
                                    <h3 className="mt-2 mb-0 fw-bold">{(totalStats.examNotNullAvgRate / 20).toFixed(1)}</h3>
                                </div>
                                <div className="col-lg-4 align-self-center">
                                    <div
                                        className="d-flex justify-content-center align-items-center thumb-xl bg-light rounded-circle mx-auto">
                                        <i className="iconoir-hexagon-dice h1 align-self-center mb-0 text-secondary"></i>
                                    </div>
                                </div>
                            </div>
                            <div className="pull-right" style={{marginTop: '15px'}} onClick={() => {
                                TrainExam.onClickTrain()
                            }}>
                                <div className="btn btn-light btn-sm">
                                    <i className="iconoir-sparks"></i>
                                    {t('startTrain')}

                                </div>
                                {/*<a href="">Тренировать</a>*/}
                            </div>
                            <p className="mb-0 text-truncate text-muted mt-3 statsListHead"><span
                                className="text-success">{totalStats.train100}%</span>
                                {t('on5')}</p>

                        </div>
                    </div>
                    {isLocal && <>
                      <div className="card cardShadow" style={{overflow: 'hidden', filter: 'blur(2px)'}} onDoubleClick={() => {
                        setImgInd(++imgInd % promoImgs?.length)
                    }}>
                        <div className="card-body3">
                            <img src={`/st/promo/i4.png`} alt=""/>
                        </div>
                    </div>
                    </>}
                    {lng == 'ru' && <div className="card cardShadow" style={{overflow: 'hidden'}} onDoubleClick={() => {
                        setImgInd(++imgInd % promoImgs?.length)
                    }}>
                        <div className="card-body3">
                            <img src={`/st/promo/${promoImgs[imgInd]}`} alt=""/>
                        </div>
                    </div>}
                </div>

            </div>

        </div>
    );
}
export function  endWord (name, count) {
    let ww = {
        'ей': {
            1 : 'ь',
            2: 'я',
            5: 'ей',
        },
        'ов': {
            1 : '',
            2: 'а',
            5: 'ов',
        }
    }

    let wwName = ww[name]
    let div = count % 10;

    if (!div) {
        return wwName[5]
    }
    if (div == 1 && count != 11) {
        return wwName[1];
    }
    if (div == 2 && count != 12) {
        return wwName[2];
    }


    return wwName[5];

}
export function  endWord2 (name, count) {

    if ((count > 1) || !count) {
        return name || ''
    }
    return ''


}
export default Layout2;
