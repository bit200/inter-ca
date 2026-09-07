import React, {useEffect, useRef, useState} from 'react';
import _ from 'underscore';
import './PreviewCourseModule.css'
import QuestionDetails from "./QuestionDetails";
import MdPreview from "./MdPreview";
import MDEditor from "@uiw/react-md-editor";
import Button from "../../libs/Button";
import QuizTraining from "./QuizTraining";
import RunQuiz from "./RunQuiz";
import MyModal from "../../libs/MyModal";
import {Link, useNavigate} from "react-router-dom";
import {generateSuggestion} from "./SuggestionItem";
import CustomStorage from "./CustomStorage";
import Train from "../TrainMethods/Train";
import {getDefaultQuizTime, getStartTimers} from "../RunExam";
import TrainPageCourse from "../TrainMethods/TrainPageCourse";
import quiz from "../Quiz";
import MockInterviewIframe from "../MockInterview/components/MockInterviewIframe";
import CourseInterviewHistory from "../MockInterview/components/CourseInterviewHistory";
import {startInterviewAttempt} from "../MockInterview/startInterviewAttempt";

let quizIteration = 0;

function CourseQuiz(props) {
    let {onAction, isLastModule, title, onSuccess, questionId, moduleId, interviewId} = props;
    let navigate = useNavigate();

    let [loading, setLoading] = useState(false);
    let [open, setOpen] = useState(false);
    let [opts, setOpts] = useState({});
    let [quizResults, setQuizResults] = useState(false);
    let [quizes, setQuizes] = useState([]);
    let [pubQuizes, setPubQuizes] = useState([]);
    let [quizPerc, setQuizPerc] = useState(0);

    // Для последнего модуля курса с настроенным interviewId кнопка "Проверить
    // знания" больше не открывает модалку с табами: интервью и есть проверка,
    // поэтому по нажатию сразу заводим попытку и открываем iframe записи. Ни
    // карточки старта, ни истории попыток по дороге не показываем - история
    // живёт отдельным блоком ниже на самой странице (CourseInterviewHistory).
    // Если попытку не удалось создать или забронировать (бот занят, ошибка
    // брони) - это не тупик: открываем обычную модалку с квизом, как раньше.
    let hasInterview = isLastModule && !!interviewId;
    let [interviewActive, setInterviewActive] = useState(null);
    let [launchingInterview, setLaunchingInterview] = useState(false);
    let [historyReloadKey, setHistoryReloadKey] = useState(0);
    let interviewAttemptRef = useRef(null);
    let interviewReservedRef = useRef(false);

    // Бронь бота надо отпускать всегда, когда мы ушли с интервью (закрыли iframe,
    // завершили попытку, закрыли вкладку) - иначе бот останется "занят" для всех.
    function releaseInterviewReservation() {
        if (!interviewReservedRef.current || !interviewAttemptRef.current) {
            return;
        }
        interviewReservedRef.current = false;
        global.http.post(`/mock-interview/my-list/${interviewAttemptRef.current._id}/release`, {}, {wo_notify: true})
            .catch(() => {});
    }

    useEffect(() => releaseInterviewReservation, []);

    function launchInterview(scb) {
        setLaunchingInterview(true);
        // POST /mock-interview/my-list резолвит уже начатую попытку по этому
        // interviewId или создаёт новую (см. контракт в itk-platform-en).
        return global.http.post('/mock-interview/my-list', {interviewId}, {wo_notify: true})
            .then(({item: attempt}) => {
                interviewAttemptRef.current = attempt;
                return startInterviewAttempt(attempt, {
                    onReserve: () => { interviewReservedRef.current = true; },
                    onRelease: releaseInterviewReservation,
                });
            })
            .then(active => {
                setInterviewActive(active);
                setLaunchingInterview(false);
                scb && scb();
            })
            .catch(err => {
                setLaunchingInterview(false);
                window.notify.warning(err?.message || 'Не удалось начать интервью. Попробуйте ещё раз.');
                // Запасной сценарий - обычный квиз в модалке; если квизов у
                // модуля нет вовсе, показывать в модалке нечего, оставляем
                // человека на странице с предупреждением.
                if (pubQuizes.length) {
                    reGenerateQuiz(scb);
                } else {
                    scb && scb();
                }
            });
    }

    function closeInterview() {
        releaseInterviewReservation();
        setInterviewActive(null);
        setHistoryReloadKey(key => key + 1);
    }

    function completeInterview() {
        let attempt = interviewAttemptRef.current;
        releaseInterviewReservation();
        setInterviewActive(null);
        setHistoryReloadKey(key => key + 1);
        global.http.put(`/mock-interview/my-list/${attempt._id}`, {status: 'completed'}, {wo_notify: true})
            .catch(() => {});
        // Интервью - альтернатива итоговому квизу, а не довесок к нему:
        // пройденное интервью закрывает модуль ровно так же, как сданный квиз -
        // тем же /save-course-module-results со status "ok" и тем же onSuccess,
        // который обновляет mHistory. Без этого модуль оставался незакрытым и
        // курс, пройденный через интервью, показывал не 100%.
        saveResults(100);
        onSuccess && onSuccess({status: 'ok'});
        // Разбор ответа и список вопросов на странице курса не помещаются -
        // уводим на ту же /mock-interviews/:id, где результаты открываются в
        // обычном потоке.
        navigate(`/mock-interviews/${attempt._id}`);
    }

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
            {(!!_quizes.length || hasInterview) && <Button className={'btn btn-sm btn-primary'} onClick={(scb) => {
                if (hasInterview) {
                    launchInterview(scb);
                    return;
                }
                reGenerateQuiz(scb)
            }}>
                <i className="iconoir-double-check"></i>
                {launchingInterview ? 'Открываем интервью...' : (title || t('checkKnowledge'))}</Button>}
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
            {isLastModule && !_quizes.length && !hasInterview &&
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

        {interviewActive && <MockInterviewIframe
            interview={interviewActive}
            onClose={closeInterview}
            onComplete={completeInterview}
        />}

        {hasInterview && <CourseInterviewHistory interviewId={interviewId} reloadKey={historyReloadKey}/>}
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
