import React, {useState, useEffect, useRef} from 'react';
import _ from 'underscore';
import {
    Link, Outlet
} from "react-router-dom";
import CodeRun from "../Suggest/CodeRun";
import MDEditor from "@uiw/react-md-editor";
// import Editor from "@monaco-editor/react";
import '../RunExam.css';
import MyModal from "../../libs/MyModal";
import RunQuiz from "../Suggest/RunQuiz";
import QuizPreview from "../Suggest/QuizPreview";
import RenderQuizResults from "../Suggest/RenderQuizResults";
import Loading from "../../libs/Loading/Loading";
import LogsStarterPreview from "../Suggest/LogsStarterPreview";
import LazyEditor from "../LazyEditor/LazyEditor";
import Train from "../TrainMethods/Train";
import Skeleton from "../../libs/Skeleton";
import MyImg from "../MyImg";
import Button from "../../libs/Button";
import {IncorrectExamData} from "./IncorrectExamData";
import {ExamLoading} from "./ExamLoading";
import {ExamUnactive} from "./ExamUnactive";
import {getExamId} from "./GetExamId";
import {WaitToStartExam} from "./WaitToStartExam";
import {ExamStartScreen} from "./ExamStartScreen";
import {ExamTimerScreen} from "./ExamTimerScreen";
import {ExamMenu} from "./ExamMenu";
import {ExamCountDown} from "./ExamCountDown";
import {getExamTasks} from "./GetExamTasks";
import {getExamQuizes} from "./GetExamQuizes";
import QuizTimer from "../TrainMethods/QuizTimer";
import {ExamQuizes} from "./ExamQuizes";
import {VsCodeWrapper} from "../VsCode/VsCodeWrapper";
import ExamResults from "../ExamResults";
import AudioShort from "../TrainMethods/AudioShort/AudioShort";
import SseTest from "../SseTest";
// import Editor from './Suggest/LazyEditor/LazyEditor'
let timer = {}


function ExamNew(props) {
    let [exam, setExam] = useState({})
    let [quizActiveInd, setQuizActiveInd] = useState(0)
    let [dbQuestions, setDbQuestions] = useState([])
    let [submitLoading, setSubmitLoading] = useState(false)
    let [jsObj, setJsObj] = useState({})
    let [history, setHistory] = useState({})
    let [quizHistory, setQuizHistory] = useState({})
    let [loading, setLoading] = useState(true)
    let [selectedInd, setSelectedInd] = useState(-1)

    let tasks = getExamTasks(exam)
    let task = tasks[selectedInd]
    let quizes = getExamQuizes(exam)
    let isVsTask = (selectedInd !== -1) && (task.type == 'vs_task');
    let isCodeRun = (selectedInd !== -1) && (task.type != 'vs_task');
    let vsHist = (exam?.vsHistory || {})[task?._id]
    console.log("qqqqq task", {task, isVsTask, isCodeRun});

    function updateExam(_exam) {
        setExam(_exam || exam);
        // global.htpp
        global.http.post('/update-exam-vs-history', {
            _id: exam?._id,
            vsHistory: exam.vsHistory
        }).then(() => {
        })
    }


    function updateVsHistory (data) {
        exam.vsHistory ??= exam.vsHistory || {};
        exam.vsHistory[task?._id] = {...exam.vsHistory[task?._id] || {}, ...data, [data.lng]: {session_id: data.session_id}}
        // exam.vsHistory[data.lng] = data.session_id;
        updateExam()
    }


    useEffect(() => {
        loadExam()
    }, [])

    function loadExam() {
        console.log("qqqqq load exammmmmmmmmmmmmm",);
        setLoading(true)
        global.http.get('/load-exam-new', {_id: getExamId()}).then(exam => {
            setExam(exam)
            setQuizHistory(exam.quizHistory)
            setSelectedInd(-1)
            setLoading(false)

            // setSelectedInd(quizes?.length ? -1 : 0)
        })
    }

    let question = dbQuestions[selectedInd] || {}
    let SUBMIT_DEFAULT = exam.availableSubmitCount || 0;

    function canSubmit() {
        return (exam.submitCount || 0) < (SUBMIT_DEFAULT || 0)
    }

    function getMinutes(exam) {
        let arr = (exam.minutesStr || '').split('\n')
        //console.log("qqqqq getMinutesgetMinutesgetMinutes", arr, exam, exam.attemptInd < 1);
        if (!exam.attemptInd) {
            return parseFloat(arr[0]) || 60
        } else {
            return arr[exam.attemptInd]
        }


    }


    let submitDetails = exam.submitDetails || {};

    function getEndDate(exam) {
        let startCd = exam.startCd;
        let minutes = getMinutes(exam);
        return new Date(startCd).getTime() + minutes * 1000 * 60;
    }

    function onSubmit(scb, ecb) {
        console.log("qqqqq exam on submit",);
        setSubmitLoading(true)
        global.http.get('/submit-task-by-user', {_id: exam._id})
            .then(r => {
                //console.log("qqqqq rrrr", r);
                setExam(r)
                scb && scb();
                setSubmitLoading(false)
            })
    }


    let warningModal = useRef(null);

    if (loading) {
        return <ExamLoading></ExamLoading>
    }
    if (/unactive/gi.test(exam.status)) {
        return <ExamUnactive></ExamUnactive>
    }

    if (/active|pending/gi.test(exam.status)) {
        let isPending = exam.status === 'pending';
        return <div style={{textAlign: 'center'}}>
            <div className="card">
                <div className="card-body">
                    {isPending && <WaitToStartExam></WaitToStartExam>}
                    {!isPending && <ExamStartScreen
                        onStarted={(exam) => {
                            setSelectedInd(-1)
                            setExam(exam)
                            loadExam();
                        }}
                    ></ExamStartScreen>
                    }
                    <ExamTimerScreen exam={exam} getMinutes={getMinutes}></ExamTimerScreen>
                </div>
            </div>
        </div>
    }

    if (exam.status === 'submitted' || submitLoading) {
        window.onRenderLeftMenu && window.onRenderLeftMenu(null)
        // selectedInd = selectedInd < 1 ? 0 : selectedInd;
        // let selTask = dbQuestions[selectedInd] || {}
        // let it = selTask;
        // let qId = it._id;
        // let perc = submitDetails[qId] ? submitDetails[qId].perc : -1;
        // let hist = history[qId] || {};
        // let code = (hist.files || {})['']
        // let logsReader = hist.logsReader || ''
        // let jsDetails = jsObj[qId] || {};
        // let files = Object.keys(hist.files || {}) || [''];
        // let isLogsReader = jsDetails.codeType == 'logreader'

        let isIncorrect = !exam?.examTemplate;
        if (isIncorrect) {
            return <>
                <IncorrectExamData></IncorrectExamData>
            </>
        }
        if (submitLoading) {
            return <>Submit Loading ...</>
        }
        return <>
            <ExamResults exam={exam} history={history} onChangeExam={exam => {
                console.log("qqqqq on change exam", exam);
                setExam({...exam})
            }}></ExamResults>
        </>
    }

    return <div className={'row'}>
        <div className="col-sm-2 sticky3">
            <div className="card">
                <div className="card-body">
                    <ExamMenu
                        {...{exam, quizHistory, submitLoading, canSubmit, selectedInd, warningModal, setSelectedInd, onSubmit}}
                    ></ExamMenu>
                </div>
            </div>
        </div>
        <div className="col-sm-10 sticky3" id={'main-content-wrap'}>
            <div style={{padding: '0 0', width: '100%', float: 'right'}}>
                <div className="pull-right btns-check-wrap">
                    <MyModal
                        size={'small'}
                        ref={warningModal}
                    >
                        <div className="tc">
                            {t('youstillhave')}
                            <div></div>
                            <ExamCountDown
                                exam={exam}
                                // end={getEndDate(exam)}
                            ></ExamCountDown>
                            <div>
                                <hr/>
                            </div>
                            <Button onClick={(scb) => {
                                warningModal.current.hide();
                                scb && scb();
                            }}>{t('thanksForUnderstanding')}</Button>
                        </div>
                    </MyModal>

                </div>
            </div>

            {selectedInd == -1 &&
                <div className={'ib w100 tc '}>
                    <div className="card">
                        <div className="card-body">
                            <div className="quizWrapRunExam">
                                <div className="quizWrapRunExamChild">
                                    <ExamQuizes
                                        quizes={quizes}
                                        quizHistory={quizHistory}
                                        onChangeAudioId={(opts) => {
                                            console.log("qqqqq onchange audio ID", opts );

                                        }}
                                        setQuizHistory={(quizHistory, localItem, localId) => {
                                            console.log("qqqqq Set Quiz History", quizHistory);
                                            setQuizHistory(quizHistory)

                                            global.http.post('/update-exam-quiz-history', {
                                                _id: exam?._id,
                                                quizHistory
                                            }).then(() => {
                                            })
                                        }}
                                    ></ExamQuizes>

                                    {/*<Train*/}
                                    {/*    isForceAcitve={true}*/}
                                    {/*    getNextInd={(ind, items) => {*/}
                                    {/*        return ++ind % items.length;*/}
                                    {/*    }}*/}
                                    {/*    preSendFBAQ={(info) => {*/}
                                    {/*        // console.log("qqqqq info", info);*/}
                                    {/*        // info.opts = info.opts || {};*/}
                                    {/*        // info.opts.exam = exam._id;*/}
                                    {/*        return info;*/}
                                    {/*    }}*/}
                                    {/*    getItemNameAndDesc={(item, props) => {*/}
                                    {/*        console.log("qqqqq GET TITLE & NAME [[ ", item, props);*/}
                                    {/*        // let smallTitle = item.specialType != 'general' ? getGeneralTitle(item) : ''*/}
                                    {/*        return pubGeneralTitle(item)*/}
                                    {/*    }}*/}
                                    {/*    getStartAudioAttempt={(ind) => {*/}
                                    {/*        console.log("qqqqq GET START Audio Attempt [[ ", ind);*/}
                                    {/*        return 0;*/}
                                    {/*    }}*/}
                                    {/*    onChangeTime={(time, timers, activeInd) => {*/}
                                    {/*        console.log("qqqqq CHANGE TIME [[", time, timers, activeInd);*/}
                                    {/*    }}*/}
                                    {/*    getStartTimers={getStartTimers}*/}
                                    {/*    getDefaultQuizTime={getDefaultQuizTime}*/}

                                    {/*    onResult={(history) => {*/}
                                    {/*        console.log("qqqqq ON RESULT course Quiz", history);*/}
                                    {/*        // setQuizResults(true)*/}
                                    {/*        return null*/}
                                    {/*    }}*/}
                                    {/*    onChangeHistory={(quizHistory, quizId) => {*/}
                                    {/*        // // if (!quizHistory.quizId) return;*/}
                                    {/*        // // console.log("qqqqq vvvv445", history, quizHistory)*/}
                                    {/*        // let questionId = -1*/}
                                    {/*        // history[questionId] ??= {}*/}
                                    {/*        // history[questionId].quizHistory = quizHistory;*/}
                                    {/*        // setHistory(history)*/}
                                    {/*        console.log("qqqqq ON CHANGE HISTORY QUIZ ]]", quizHistory);*/}
                                    {/*        // updateExam(history[questionId], questionId)*/}
                                    {/*    }}*/}
                                    {/*    onChange={(quizHistory) => {*/}
                                    {/*        console.log("qqqqq ON CHANGE QUIZ ]]", quizHistory);*/}

                                    {/*    }}*/}
                                    {/*    onSubmit={(v1, v2, v3) => {*/}

                                    {/*        console.log("qqqqq ON SUBMIT course QUIZ ]]", v1, v2, v3);*/}
                                    {/*    }}*/}
                                    {/*    onReStartAttempt={(v) => {*/}
                                    {/*        console.log("qqqqq ON RESTART_ATTEMPT course QUIZ ]]", v);*/}
                                    {/*    }}*/}
                                    {/*    onStart={(v) => {*/}
                                    {/*        console.log("qqqqq ON START course QUIZ ]]", v);*/}
                                    {/*    }}*/}
                                    {/*    onReStart={(v) => {*/}
                                    {/*        console.log("qqqqq ON RE_START course QUIZ ]]", v);*/}
                                    {/*    }}*/}
                                    {/*    onStop={(v) => {*/}
                                    {/*        console.log("qqqqq ON STOP on Stop ]]", v);*/}
                                    {/*    }}*/}
                                    {/*    getStartItems={async () => {*/}
                                    {/*        console.log("qqqqq GET START ITEMS ---- ]] ", quizes);*/}
                                    {/*        return quizes.map(item => {*/}
                                    {/*            return {item}*/}
                                    {/*        });*/}
                                    {/*    }}*/}
                                    {/*    getStartIndex={(items, history) => {*/}
                                    {/*        return 0;*/}
                                    {/*        // // return 7*/}
                                    {/*        // let startInd = -1;*/}
                                    {/*        // let isAlreadyNotEmpty = false;*/}
                                    {/*        // let timers = getStartTimers(items, history)*/}
                                    {/*        // _.each(items, ({item}, ind) => {*/}
                                    {/*        //     let hist = history[item._id] || {}*/}
                                    {/*        //     let isSubmitted = hist.hash || _.size(hist.chosen)*/}
                                    {/*        //     let timersItem = timers[ind] || {}*/}
                                    {/*        //     if (timersItem.totalTime && !timersItem.time) {*/}
                                    {/*        //         return;*/}
                                    {/*        //     }*/}
                                    {/*        //     if (!isSubmitted && !isAlreadyNotEmpty) {*/}
                                    {/*        //         startInd = ind;*/}
                                    {/*        //         isAlreadyNotEmpty = true;*/}
                                    {/*        //         // console.log("qqqqq itemtmtmtmtmtmmt",*/}
                                    {/*        //         //     {startInd, isAlreadyNotEmpty, isSubmitted}, item, timers, hist);*/}
                                    {/*        //     }*/}
                                    {/*        //*/}
                                    {/*        // })*/}
                                    {/*        // console.log("qqqqq items4446666", startInd, items, history);*/}
                                    {/*        //*/}
                                    {/*        // if (startInd == -1) {*/}
                                    {/*        //     return -1;*/}
                                    {/*        // }*/}
                                    {/*        // // console.log("qqqqq GET START Index [[ ", 1);*/}
                                    {/*        // return startInd;*/}
                                    {/*    }}*/}
                                    {/*    getStartHistory={() => {*/}
                                    {/*       return {}*/}
                                    {/*    }}*/}
                                    {/*    Result={RestulExamPage}*/}
                                    {/*    opts={{*/}
                                    {/*        uploadAudioUrl: '/api/upload-audio',*/}
                                    {/*        codeChangeUrl: '/code-typing',*/}
                                    {/*        plainCodeChangeUrl: '/code-typing',*/}
                                    {/*        isExam: true,*/}
                                    {/*        woClickTopCircleNavigation: true,*/}
                                    {/*        woTopCircleNavigation: false,*/}
                                    {/*        // resetTimeOnClickItem: true,*/}
                                    {/*        quizesLength: quizes?.length,*/}

                                    {/*        woUploadAudio: false,*/}
                                    {/*        startWebCam: false,*/}
                                    {/*        preventOnNext: false,*/}
                                    {/*        textToVoiceTimeoutMS: 0,*/}
                                    {/*        textToVoiceSpeedMSPerSymbolLimit: 100,*/}
                                    {/*        msForRecognitionInnerProcess: 1000,*/}
                                    {/*        playTextSpeechBeforeQuiz: true,*/}
                                    {/*        playTextSpeechAfterAudioRecord: false,*/}
                                    {/*        canResubmitQuiz: false,*/}
                                    {/*        showGrowTags: false,*/}
                                    {/*        woNext: false,*/}

                                    {/*        debugCompareRateOnCodeChange: true,*/}

                                    {/*        MSBeforeAudioStart: 100,*/}
                                    {/*        isErrRec: true,*/}
                                    {/*        quizExam: 600,*/}
                                    {/*        quizOpenNextExam: 600,*/}
                                    {/*        quizOpenNextIfCorrectMs: 600,*/}
                                    {/*        quizOpenNextIfIncorrectMs: 5000,*/}
                                    {/*        maxAttemptsCount: 5,*/}
                                    {/*        attemptsForNextIfNot5: 2*/}
                                    {/*    }}*/}
                                    {/*>*/}
                                    {/*</Train>*/}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            }
            {isVsTask && <div>
                <div className="card">
                    <div className="card-body">
                        <VsCodeWrapper
                            // session_id={vsHist?.session_id}
                            exam_id={exam?._id}
                            task_group={task}
                            type={'client'}
                            existing_session_history={vsHist}
                            on_change={({session_id, lng}) => {
                                console.log("qqqqq rrrrrrrr start session complete {session_id} Changed:",session_id );
                                updateVsHistory({session_id, lng})
                            }}
                        ></VsCodeWrapper>
                    </div>
                </div>
            </div>}
            {/*{isCodeRun && <CodeRun*/}
            {/*    isNewExam={true}*/}
            {/*    question={question}*/}
            {/*    onChangeCurStr={(v) => {*/}
            {/*        if (question && question._id && v) {*/}
            {/*            let questionId = question._id;*/}
            {/*            history[questionId] ??= {}*/}
            {/*            history[questionId].curCasesStr = v;*/}
            {/*            setHistory({...history})*/}
            {/*            updateExam(history[questionId], questionId)*/}
            {/*        }*/}

            {/*    }}*/}
            {/*    onChangeCode={(v, file) => {*/}
            {/*        file = file || ''*/}
            {/*        let questionId = question._id;*/}
            {/*        history[questionId] ??= {}*/}
            {/*        history[questionId].files = {...history[questionId].files, [file]: v}*/}
            {/*        setHistory({...history})*/}
            {/*        //console.log("qqqqq on change code is changed", history[questionId], history, questionId);*/}

            {/*        updateExam(history[questionId], questionId)*/}
            {/*    }*/}
            {/*    }*/}
            {/*    onChangeLogs={(v) => {*/}
            {/*        //console.log("qqqqq change logs", v);*/}
            {/*        let questionId = question._id;*/}
            {/*        history[questionId] ??= {}*/}
            {/*        history[questionId].logsReader = v;*/}
            {/*        setHistory({...history})*/}

            {/*        updateExam(history[questionId], questionId)*/}

            {/*    }*/}
            {/*    }*/}
            {/*    history={(history || {})[question._id]}*/}
            {/*    jsDetails={jsObj[question._id]}*/}
            {/*    isExam={true}></CodeRun>}*/}


        </div>
    </div>
}


export function getLng(fileName) {
    let ext = (fileName || '').trim('').split('.').pop();
    console.log("qqqqq ext", ext);
    let extensions = {
        'js': 'javascript',
        'jsx': 'javascript',
        'ts': 'javascript',
        'htm': 'html',
        'html': 'html',
        'xhtml': 'html',
        'md': 'md',
        'tsx': 'javascript',
        'css': 'css',
        'scss': 'scss',
        'less': 'less',
        'ja': 'java',
        'py': 'python',
        'txt': 'text',
    }
    return extensions[ext] || 'md'
}

export function getDefaultQuizTime(item) {
    console.log("qqqqq get def quiz time", item );
    let {answerType, time} = item?.item || item || {};
    if (time) {
        return time
    }
    answerType = answerType || 'quiz'
    return answerType === 'audio' ? 120 :
        answerType === 'quiz' ? 40 :
            answerType == 'code' ? 150 : 40
}


export function getStartTimers(items, history) {
    console.log("qqqqq GET START TIMERS [[ ", items, history);
    return [{time: 24, totalTime: 35}];

    let obj = {};
    _.each(items, (item, ind) => {
        let _id = ((item || {}).item || {})._id
        let cd = +((history || {})[_id] || {}).cd
        let time = getDefaultQuizTime(item)
        console.log("qqqqq timer3333", time, item);
        let delta = cd ? Math.round((new Date().getTime() - cd) / 1000) : 0;
        if (cd) {
            obj[ind] = {
                time: Math.max(0, time - delta),
                totalTime: time
            }
        } else {
            obj[ind] = {
                time, totalTime: time
            }
        }
    })

    console.log("qqqqq timer333344", obj);
    return {time: 24, totalTime: 35};

}

function RestulExamPage(props) {
    console.log("qqqqq result pageeeee", props);
    return <div className={'tc'} style={{padding: '50px 0', fontSize: '24px'}}>{
        t('congratExamComplete')
    }</div>
}


export function pubGeneralTitle(item) {
    let {answerType, specialName, specialTitle, specialType, specialQuestionType} = item;
    console.log("qqqqq item44444", specialTitle, item);

    let smallTitle = ''
    let isGeneral = specialType == 'general';

    if (isGeneral) {
        if (/task/gi.test(specialQuestionType)) {
            smallTitle = t('audioQ1')
            // }
            // if (specialQuestionType == 'task') {
            //     smallTitle = 'Поясните решение'
            // } else if (specialQuestionType == 'js-task') {
            //     smallTitle = 'Поясните решение'
        } else if (answerType !== 'quiz') {
            smallTitle = t('audioQ2')
        }
        // smallTitle = answerType = 'code' ? 'Поясните решение' : answerType == 'audio' ? 'Осветите тему' : ''
    }

    function getSpecialName() {
        let v = specialTitle || specialName
        let size = (v || '').length;
        if (size > 200) {
            return ''
        }
        return v;

    }

    let title = getQuizName(item) || getSpecialName() || smallTitle;
    let desc = isGeneral && title != specialName ? specialName : '';

    console.log("qqqqq smallTitlt", {smallTitle, title, specialTitle, desc});
    return {
        lng: '',
        smallTitle,
        title,
        specialTitle: specialTitle != title ? specialTitle : '',
        desc: [title, specialTitle].indexOf(desc) > -1 ? '' : desc
        // desc: 'item.name MD description !!!'
    }

}


export function getQuizAnyName(quiz) {
    let res = getQuizName(quiz) || quiz?.specialTitle || quiz?.specialName
    console.log("qqqqq quiz4444", quiz, res);
    return res;
}

export function getQuizName(item) {
    let {answerType = 'quiz'} = item;
    if (answerType === 'quiz') {
        return item.name;
    } else if (answerType === 'audio') {
        return item.audioName
    } else if (answerType === 'code') {
        return item.codeName
    } else {
        return 'Unknown Name!!'
    }
}

export default ExamNew
