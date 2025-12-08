import React, {useEffect, useState} from 'react';
import _ from 'underscore';
import './PreviewCourseModule.css'
import QuestionDetails from "./QuestionDetails";
import MdPreview from "./MdPreview";
import MDEditor from "@uiw/react-md-editor";
import Button from "../../libs/Button";
import QuizTraining from "./QuizTraining";
import RunQuiz from "./RunQuiz";
import MyModal from "../../libs/MyModal";
import {Link, useHistory} from "react-router-dom";
import {generateSuggestion} from "./SuggestionItem";
import CustomStorage from "./CustomStorage";
import Train from "../TrainMethods/Train";
import {getDefaultQuizTime, getStartTimers} from "../RunExam";
import TrainPageCourse from "../TrainMethods/TrainPageCourse";
import quiz from "../Quiz";

let quizIteration = 0;

function CourseQuiz(props) {
    let {onAction, isLastModule, title, onSuccess, questionId, moduleId} = props;

    let [loading, setLoading] = useState(false);
    let [open, setOpen] = useState(false);
    let [opts, setOpts] = useState({});
    let [quizResults, setQuizResults] = useState(false);
    let [quizes, setQuizes] = useState([]);
    let [pubQuizes, setPubQuizes] = useState([]);
    let [quizPerc, setQuizPerc] = useState(0);

    let localQuizIteration;
    localQuizIteration = quizIteration;
    //console.log("qqqqq propspropspropsprops", props);
    useEffect(() => {
        loadQuiz()
    }, [questionId])

    useEffect(() => {
        if (!quizResults) {
            return;
        }
        saveResults(quizPerc)
    }, [quizResults])


    function getQuizPerc(quizHistory) {
        let corTotal = 0;
        let total = 0;
        let isAudio = (item = {}) => {
            return item.hash;
        }

        _.each(quizHistory.history, (item, ind) => {
            total++;
            if (item && (item?.isCorrect || item?.data?.isCorrect)) {
                corTotal++
            } else if (item && isAudio(item) && (item.rate || item.audioRate)) {
                corTotal++
            }
        })

        return {quizPerc: Math.round(100 * (corTotal / (quizes.length || 1))), total};

    }

    function saveResults(quizPerc, cb) {
        let total = (quizes || []).length;
        onAction('complete_quiz', quizPerc)


        if (questionId) {
            let opts = {
                quizPerc,
                question: questionId || '',
                total,
                courseUserId: props.courseUserId,
                status: getIsQuizOk(quizPerc) ? 'ok' : 'error',
            }

            global.http.post('/save-course-module-question-results', opts)
                .then(r => {
                    setOpts(opts)
                    cb && cb();
                })
        } else {
            let opts = {
                quizPerc,
                total,
                courseModule: moduleId,
                courseUserId: props.courseUserId,
                status: getIsQuizOk(quizPerc) ? 'ok' : 'error',
            };
            global.http.post('/save-course-module-results', opts)
                .then(r => {
                    setOpts(opts)
                    cb && cb();
                })
        }
    }

    function loadQuiz(scb, ecb) {
        setLoading(new Date().getTime());
        setQuizResults(false);
        ++quizIteration
        let opts = {question: questionId || 0, _id: moduleId, cd: new Date().getTime()};
        setPubQuizes([])
        global.http.get('/load-quizes-by-module', opts).then((r) => {
            setLoading(false)
            //console.log("qqqqq LOADED INFORMATIONNNNNNNNN",);
            let items = [...r.quizes || []]
            setQuizes(items)
            setPubQuizes([...r.pubQuizes])
            scb && scb();
        }).catch(e => {
            setLoading(false)
            window.notify.error(e.toString())
        })
    }

    function simpleGenerateQuiz(scb, ecb) {
        setLoading(false)
        if (!quizes.length) {
            setQuizPerc(100);
            setQuizResults(true);
            onClose();
        }
    }

    function reGenerateQuiz(scb, ecb) {
        setOpen(true)
        setOpts({});
        loadQuiz(scb, ecb);
        // global.http.get('/load-quizes-by-module', opts).then((r) => {
        //    //console.log("qqqqq rrrr4444444", r);
        //     let items = [...r.quizes];
        //     setQuizes(items)
        //     setPubQuizes(r.pubQuizes)
        //     scb && scb()
        //     setLoading(false)
        //     if (!items.length) {
        //         setQuizPerc(100);
        //         setQuizResults(true);
        //     }
        // })
    }

    function getIsQuizOk(quizPerc) {
        return quizPerc >= QUIZ_NORMAL
    }

    function onClose() {
        hideModal()
        opts && opts.status === 'ok' && onSuccess && onSuccess(opts)
    }

    function hideModal() {
        setOpen(false)
    }


    let QUIZ_NORMAL = 85;
    let isQuizOk = getIsQuizOk(quizPerc);
    //console.log("qqqqq quizesquizesquizes ))", {pubQuizes, quizes, isLastModule, loading});
    let _quizes = pubQuizes

    //console.log("qqqqq pubQuizes ))", _quizes);
    let fn = (...args) => {
        //console.log("qqqqq ]]]]]]]]]]", args);
    }
    let isEmptyQuiz = !isLastModule && !_quizes.length;

    return <div>
        {!!loading &&
            <button className={'btn btn-sm btn-primary'} style={{opacity: 1}} disabled={true}>
                {t('loadingResultsTesting')}
                ...</button>}
        {!loading && <>
            {!!_quizes.length && <Button className={'btn btn-sm btn-primary'} onClick={(scb) => {
                reGenerateQuiz(scb)
            }}>
                <i className="iconoir-double-check"></i>
                {title || t('checkKnowledge')}</Button>}
            {isEmptyQuiz && <><Button
                // disabled={true}
                className={'btn btn-sm btn-primary'} onClick={(scb) => {
                saveResults(100, () => {
                })
                onSuccess && onSuccess({status: 'ok'}, () => {
                    scb && scb()
                })

            }}>
                <i className="iconoir-double-check"></i>
                {t('next')}</Button>
                <div>
                    <small>
                        {t('noCheckTasks')}
                    </small>
                </div>
            </>}
            {isLastModule && !_quizes.length &&
                <Link to='/courses' className={'btn btn-sm btn-primary'} onClick={(scb) => {
                    saveResults(100, () => {
                    })
                    onSuccess && onSuccess({status: 'ok'}, () => {
                        scb && scb()
                    })

                }}>{t('completeAndReturn')}</Link>}
        </>}


        <MyModal
            woClose={true}
            size={'lg'}
            isOpen={open}
            onClose={onClose}
        >
            <>

                {!loading && !quizResults && !!_quizes.length && <div>
                    <TrainPageCourse
                        onResult={() => {
                            console.log("777777 qqqqq EEEEEEEEEEEEEEEEEEEEEEEEE onRESULT444",);
                            // setOpen(false)
                            setQuizResults(true)
                        }}
                        skipBottomOpenText={true}
                        Result={ResultCourseQuizPage}
                        opts={{quizes: pubQuizes}}
                        onChange={(quizHistory, v) => {
                            let {data = {}, answerType, history} = quizHistory;

                            let time = data?.time || 1000;
                            // console.log("777777 qqqqq ON CHANGE EEEEEEEEEEEEEEEEEEEEEEEEE ]]", time, quizHistory, data, answerType);
                            let {quizPerc, total} = getQuizPerc(quizHistory)
                            //console.log("qqqqq quiz Perc ]]] ", quizPerc, total, v);
                            setQuizPerc(quizPerc);
                            // if (answerType === 'quiz' && !data?.data?.isCorrect) {
                            //     setTimeout(() =>{
                            //         setQuizResults(true)
                            //     }, time)
                            // }
                        }}
                    />
                </div>}

                {quizResults && <div className={'animChild'}>
                    {/*{<div>*/}
                    <div className={'quiz-result-title'}>
                        {isQuizOk ? t('congratQuizMsg') : t('needMoreTimeQuizMsg')}
                    </div>
                    <hr/>
                    {!_quizes.length && <>
                        <strong style={{marginBottom: '10px', display: 'inline-block'}}>{t('goodMsg1')}</strong>
                        <div>
                            {t('goodMsg2')}


                        </div>
                    </>}
                    {!!_quizes.length && <div>
                        <strong style={{marginBottom: '10px', display: 'inline-block'}}>{t('quizResults')}</strong>
                        <div></div>
                        {t('yourPoints')}: {quizPerc}%
                        <div></div>
                        {t('needPoints')}: {QUIZ_NORMAL}%+
                    </div>}
                    <hr/>
                    {!isQuizOk && <>
                        <Button color={0} onClick={(scb) => {
                            setOpen(false)
                            scb && scb()
                        }}>{t('continueLearning')}</Button>
                        <Button color={4} onClick={(scb) => {
                            reGenerateQuiz(scb)
                        }}>
                            {t('restartQuiz')}
                        </Button>
                    </>

                    }

                    {isQuizOk && !isLastModule && <Button color={0} onClick={(scb) => {
                        onClose()
                        scb && scb()
                    }
                    }>Отлично, перейти к след модулю</Button>}
                    {isQuizOk && isLastModule && <Button color={0} onClick={(scb) => {
                        onClose()
                        scb && scb()
                    }
                    }>Отлично, ты прошел курс! Молодец!</Button>}


                </div>}
            </>


        </MyModal>
        {/*{!!_quizes.length && <TrainPageCourse*/}
        {/*    onResult={() => {*/}
        {/*        setOpen(false)*/}
        {/*    }}*/}
        {/*    Result={ResultCourseQuizPage}*/}
        {/*    opts={{quizes: pubQuizes}}*/}
        {/*/>}*/}
    </div>
}

function ResultCourseQuizPage(props) {
    return <div>Result Page333!!!!!</div>
}

export default CourseQuiz
