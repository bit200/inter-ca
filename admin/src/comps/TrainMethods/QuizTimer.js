import React, {useEffect, useRef, useState} from 'react';
import _ from 'underscore';
import './Train.css'
import {
    Link, Outlet
} from "react-router-dom";
import AudioShort from "./AudioShort/AudioShort";

import QuizPreview from "../Suggest/QuizPreviewNew";
import {CountDownSecs} from "./CoundDownSec";
import {isErr} from "./DisableScreenWhenTrain";
import CodeReview from "./CodeReview/CodeReview";
import DebugLogs from "../DebugLogs";
import {stopAnyPlay} from "../../App";
import {avatarClasses} from "@mui/material";

let lastToggle = new Date().getTime();

function getHash() {
    return Math.round(new Date().getTime() / 1000)
}


function QuizTimer(props) {
    let [process, setProcess] = useState(false);
    let [isResults, setIsResults] = useState(false);
    let [active, setActive] = useState(false);
    let [hist, setHist] = useState({});
    let [time, setTime] = useState({});
    let [timeoutIteration, setTimeoutIteration] = useState(0);

    let {quiz, isExam, onTimeout, history} = props;
    let {answerType} = quiz;
    let quizId = getQuizId()
    let perc = Math.round(100 * (props.totalTime / time))

    let isErrRec = perc < 30 && time > -1;
    let activeEl = useRef()

    useEffect(() => {
        if (!quizId) {
            return;
        }
        setTimeoutIteration(quizId)
        setActive(false)
        setTime(props.time)
        setHist({})
    }, [quizId])

    useEffect(() => {
        console.log("qqqqq is active changed", active);
    }, [active])
    function getQuizId() {
        return quiz?._id;
    }


    function getStartAudioAttempt () {
        return 0
    }




    console.log("qqqqq timetimetimetime", {time, hist});

    let EXT_OBJ = {
        onReStartAttempt:  () => {
            console.log("qqqqq qqqqqqqqqqqqqqq onRestart Attempt", v);
        },
        onStart:  (v) => {
            setActive(true)
            console.log("qqqqq qqqqqqqqqqqqqqq onStart", active, v);
            props.onStart && props.onStart(v)

        },
        onStop:  (v) => {
            console.log("qqqqq qqqqqqqqqqqqqqq onStopTimer", v);

        },
        onNext: (v) => {
            console.log("qqqqq qqqqqqqqqqqqqqq onNext", v, props);
            props.onNext && props.onNext()
        },

        onSubmit: (v) => {
            v ??= {}
            v.isSubmit = true;
            v.finishTime = new Date().getTime();
            setHist(v)
            setActive(false)
            props.onSubmit && props.onSubmit(v)
            console.log("qqqqq qqqqqqqqqqqqqqq onSubmit", v);
        },
        onChange: (v) => {
            console.log("qqqqq qqqqqqqqqqqqqqq onChange", v);
        },
        preventOnNext: true,
        getCodeFiles: props.getCodeFiles,
        getStartAudioAttempt: () => {
            return 0
        },
        getItemNameAndDesc: (item) => {
            return {title: item.name || item.audioName}
        },
        attemptsForNextIfNot5: props.attemptsForNextIfNot5,
        item: quiz,
        ref: activeEl,
        isExam,
        opts: {
            playTextSpeechBeforeQuiz: true,
        },
        time: Math.round(time),
        timeSpent: props.totalTime - time,
        hist: props.hist,
        quizId: getQuizId(),
        onNextQuizTimer: props.onNextQuizTimer,
        onNextAudioTimer: props.onNextAudioTimer
    }

    // if (EXT_OBJ.time == 0) {
    //     setProcess(false)
    // }

    let timer = {totalTime: props.totalTime, time}
    let isFast = (new Date().getTime() - lastToggle) < 400;

    // let isActive = active;
    console.log("qqqqq qqqqqqqqqqqqqqq isActive", {active, quizId, quiz});

    return <div>
        <div className={'trainContent ' + (isErrRec ? ' timerErrorWrap' : '')}>
            <div className={'timerWrap'}>
                <div className={"timerProgress "
                    + (isFast ? ' fastTimer' : '')}
                     style={{width: (timer.time < 1) ? '5px' : (((timer.time / timer.totalTime || 1) * 100) + '%')}}></div>
            </div>
            {answerType === 'audio' && <AudioShort
                showCodeRate={false}
                showRecognizedText={true}
                {...EXT_OBJ}
            ></AudioShort>}
            {answerType === 'code' && <CodeReview
                opts={props.opts}
                time={timer.time} //for render in circle the value
                {...EXT_OBJ}
            ></CodeReview>}
            {answerType === 'quiz' && <div>
                <QuizPreview
                    showCodeRate={false}
                    showRecognizedText={true}
                    {...EXT_OBJ}
                ></QuizPreview>
            </div>}

            <CountDownSecs
                onStop={() => {
                    console.log("qqqqq qqqqqqqqqqqqqqq on stop timeout", hist);
                    if (hist?.isSubmit) return
                    activeEl.current?.onTimeOut && activeEl.current?.onTimeOut();
                }}
                active={active}
                hideValue={true}
                totalTime={props.totalTime}
                count={time}
                iteration={timeoutIteration}
                quizId
                onChange={(time, perc) => {
                    console.log("qqqqq qqqqqqqqqqqqqqq onTimer", time, perc);
                    setTime(time)
                }}
            ></CountDownSecs>
        </div>


    </div>
}



export default QuizTimer
