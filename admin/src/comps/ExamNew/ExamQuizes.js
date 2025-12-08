import MyImg from "../MyImg";
import React, {useEffect, useState} from "react";
import QuizTimer from "../TrainMethods/QuizTimer";
import {getDefaultQuizTime} from "./ExamNew";

export function ExamQuizes({quizes, quizHistory, setQuizHistory}) {
    let [activeInd, setActiveInd] = useState(0)
    let [tt, setTime] = useState(0)
    let quiz = quizes[activeInd]
    let quizId = quiz?._id;
    let hist = (quizHistory || {})[quizId]
    let cd = new Date().getTime()
    quizHistory ??= {}

    useEffect(() => {
        let first_index = 0;
        let is_finish = false;
        _.each(quizes, (item, ind) => {
            console.log("qqqqq quiz item", );
            if (!is_finish && quizHistory[item?._id]?.isSubmit) {
                first_index = ind + 1
            } else {
                is_finish = true;
            }
        })
        console.log("qqqqq first_index", first_index, quizes, quizHistory);
        setActiveInd(first_index)
    }, [JSON.stringify(quizes)])
    if (activeInd == -1 || activeInd >= quizes?.length) {
        return <>
            <img src="" alt=""/>
            <h4>
                {t('congratExamComplete')}
            </h4>
        </>
    }
    function getQuizTime (quiz) {
        if (quiz.answerType == 'audio') {
            return quiz.durationAudio
        }
        return quiz.durationQuiz
    }


    let totalTime = getQuizTime(quiz) || getDefaultQuizTime();
    let time = hist?.startTime ? Math.round((totalTime - ((hist?.finishTime || cd) - (hist?.startTime || 0)) / 1000) || -1) : totalTime;


    function extendHistory(opts, quizId) {
        setQuizHistory({...quizHistory, [quizId]: {...(quizHistory || {})[quizId], ...opts}})
        setTime(new Date().getTime())
    }


    return <>
        {activeInd + 1} из {quizes?.length}
        <QuizTimer
            isExam={true}
            quiz={quiz}
            time={time}
            totalTime={totalTime}
            onNextQuizTimer={500}
            onNextAudioTimer={1000}
            hist={hist}
            onSubmit={(v) => {
                console.log("qqqqq qqqqqqqqqqqqqqqqqqqqqqqqqqqqq submit Parent History", v);
                extendHistory(v, quizId)
            }}
            onStart={(v) => {
                console.log("qqqqq qqqqqqqqqqqqqqqqqqqqqqqqqqqqq Start quzzzzzzzzzzzzzzzzz", v);
                extendHistory({startTime: hist?.startTime || new Date().getTime()}, quizId)
            }}
            onNext={(v) => {
                setActiveInd(++activeInd)
                console.log("qqqqq qqqqqqqqqqqqqqqqqqqqqqqqqqqqq open next", v);
            }}
        >
        </QuizTimer>
    </>
}

