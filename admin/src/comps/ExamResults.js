import React, {useEffect, useState} from 'react';
import RenderQuizResults from "./Suggest/RenderQuizResults";
import MDEditor from "@uiw/react-md-editor";
import LogsStarterPreview from "./Suggest/LogsStarterPreview";
import LazyEditor from "./LazyEditor/LazyEditor";
import MyImg from "./MyImg";
import {ExamResultsQuiz, isQuizOk} from "./ExamResultsQuiz";
import {ExamResultsVs, isVsOk} from "./ExamResultsVs";
import {ExamResultsAudio} from "./ExamResultsAudio";

function Layout2(props) {
    //console.log('*........ ## ROOT RENDER', props);
    let {submitLoading, exam, history, isLogsReader, onChangeExam} = props || {};
    let {vsHistory, quizHistory} = exam || {}
    vsHistory ??= {};
    quizHistory ??= {};
    let {quizesDb, vsTasksDb, audioDb} = exam?.templateInfo || {};
    let [quizInd, setQuizInd] = useState(0)
    let [audioQuizInd, setAudioQuizInd] = useState(0)
    let [runHist, setRunHist] = useState({})
    let [vsInd, setVsInd] = useState(0)
    let selQuiz = quizesDb[quizInd]
    let selAudioQuiz = audioDb[audioQuizInd]
    let selVs = vsTasksDb[vsInd]
    console.log("qqqqq render exam results", {quizesDb, vsTasksDb, audioDb, vsHistory, quizHistory});


    useEffect(() => {
        let session_ids = []
        _.each(exam.vsHistory, (item, ind) => {
            session_ids.push(item.session_id)
        })

        global.http.get('/get-exam-run-history', {session_ids}).then(runHist => {
            setRunHist(runHist)
        })
    }, [exam._id])

    function getQuizRate(_id) {
        let it = quizHistory[_id]
        let quizDb = quizesDb.find(it => it._id == _id)
        let selectedInd = it?.data?.selectedInd;
        if (!it) {
            return 'unknown'
        }
        if (isQuizOk(quizDb, selectedInd)) {
            return 'correct'
        }
        return 'incorrect'
    }

    function getAudioRate(quizId) {
        return ((quizHistory || {})[quizId] || {}).userRate
    }


    console.log("qqqqq runHist !!! Exam", exam);
    // let v = useActionData();
    return <div>
        <div className={'mainCont2 row animChild ' + (submitLoading ? 'o4' : '')}>
            {!!audioDb?.length && <>
                <div className="col-sm-12">
                    <h4>{t("audio")}</h4>
                </div>
                <div className="col-sm-12 animChild " >
                    <div className="card">
                        <div className="card-body row">
                            <div className="col-sm-4">
                                {(audioDb || []).map((it, ind) => {
                                    let rate = getAudioRate(it._id)
                                    return (
                                        <div key={ind}
                                             className={'pointer ' + (audioQuizInd == ind ? 'activeBlock' : '')}
                                             onClick={() => {
                                                 setAudioQuizInd(ind)
                                             }}>
                                            <div
                                                className={"badge ib mr-5 " + (rate > 0 ? 'bg-primary' : 'bg-warning')}>
                                                {getAudioRate(it._id) || t("need_your_rate")}
                                            </div>
                                            {it.audioName || '-'}
                                        </div>)
                                })}
                            </div>
                            <div className="col-sm-8 " style={{paddingBottom: '30px'}}>
                                <ExamResultsAudio
                                    onRate={(quiz_id, userRate) => {
                                        quizHistory[quiz_id] ??= {};
                                        quizHistory[quiz_id] = {...quizHistory[quiz_id] || {}, userRate}
                                        exam.quizHistory = {...quizHistory};
                                        console.log("qqqqq exam!!!!!!!",);
                                        onChangeExam(exam)
                                        global.http.get('/exam-audio-rate', {
                                            exam_id: exam?._id,
                                            quiz_id,
                                            rate: userRate
                                        }).then(r => {
                                            console.log("qqqqq exam audio rated",);
                                        })
                                    }}
                                    quiz={selAudioQuiz} hist={quizHistory[selAudioQuiz?._id]}></ExamResultsAudio>

                            </div>
                        </div>
                    </div>
                </div>


            </>}
            {!!quizesDb?.length && <>
                <div className="col-sm-12">
                    <h4>{t('quizes')}</h4>
                </div>
                <div className="col-sm-12 animChild" >
                    <div className="card">
                        <div className="card-body row">
                            <div className="col-sm-4">
                                {(quizesDb || []).map((it, ind) => {
                                    let rate = getQuizRate(it._id)
                                    return (
                                        <div key={ind} className={'pointer ' + (quizInd == ind ? 'activeBlock' : '')}
                                             onClick={() => {
                                                 setQuizInd(ind)
                                             }}>
                                            <div
                                                className={"badge ib mr-5 " + (rate == 'correct' ? 'bg-primary' : 'bg-warning')}>
                                                {t(rate)}
                                            </div>
                                            {it.name}
                                        </div>)
                                })}
                            </div>
                            <div className="col-sm-8 " style={{paddingBottom: '30px'}}>
                                <ExamResultsQuiz quiz={selQuiz} hist={quizHistory[selQuiz?._id]}></ExamResultsQuiz>
                            </div>
                        </div>
                    </div>
                </div>
            </>}
            {!!vsTasksDb?.length && <>
                <div className="col-sm-12">
                    <h4>{t('tasks_multi')}</h4>
                </div>
                <div className="col-sm-12 animChild">
                    <div className="card">
                        <div className="card-body row">
                            <div className="col-sm-4">

                            {(vsTasksDb || []).map((it, ind) => {
                                let hist = (vsHistory || {})[it._id]
                                let session_id = hist.session_id;
                                let runHist = (exam.runHistory || {})[session_id];
                                let {status, total} = runHist || {}
                                console.log("qqqqq it444444444", hist, exam, runHist);
                                return (<div key={ind}
                                             className={'pointer ' + (vsInd == ind ? 'activeBlock' : '')}
                                             onClick={() => {
                                                 setVsInd(ind)
                                             }}>
                                    <div
                                        className={"badge ib mr-5 " + (status == 'ok' ? 'bg-primary' : 'bg-warning')}>
                                        {t(status == 'ok' ? 'correct' : status ? 'incorrect' : 'test_pending')}
                                    </div>
                                    {it.name}
                                </div>)
                            })}

                            </div>
                            <div className="col-sm-8 ">
                                <div>
                                    <ExamResultsVs vs={selVs} hist={vsHistory[selVs?._id]}
                                                   runHist={exam.runHistory}></ExamResultsVs>
                                </div>
                        </div>
                        </div>
                    </div>
                </div>
            </>}


        </div>
    </div>
}

export default Layout2
