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

let lastToggle = new Date().getTime();

function getHash() {
    return Math.round(new Date().getTime() / 1000)
}

let globalActiveInd = 0;

function Train(props) {
    let [genVariables, setGenVariables] = useState(null);
    let [process, setProcess] = useState(false);
    let [isResults, setIsResults] = useState(false);
    let [timers, setTimers] = useState({});
    let [history, setHistory] = useState({});
    let [items, setItems] = useState(props.items || []);
    let [activeInd, setActiveInd] = useState(0);
    let [timeoutIteration, setTimeoutIteration] = useState(0);
    globalActiveInd = activeInd;
    //for Component Training between two different Chrome Tabs
    window.onStopTrain = () => {
        navigate('/')
    }
    window.reloadTrain = () => {
        loadTrains({})
    }

    useEffect(() => {
        // setTimeoutIteration(++timeoutIteration)
    }, [])
    useEffect(() => {
        isResults && props.onResult && props.onResult(history);
    }, [isResults])

    //load everything for start;
    useEffect(() => {
        lastToggle = new Date().getTime();
        //
        // if ((isErr() || {}).err) {
        //     return;
        // }

        loadTrains({})

        //for Disable Active
        window.startTrain && window.startTrain()
        return () => {
            window.stopTrain && window.stopTrain()
        }
    }, [])

    async function loadTrains(data) {
        setIsResults(false)

        let items = await props.getStartItems()
        setItems([...items])
        resetHistory(items)
        console.log("qqqqq qqq ON LOCAL LOAD TRAINS", );
        console.log("qqqqq items Loaded: ", items);
    }

    function resetHistory(items) {
        let history = props.getStartHistory();
        console.log("qqqqq historyhistoryhistory", history);
        setProcess(false)
        setTimers(props.getStartTimers(items, history))
        setHistory(history)
        setActiveInd(-1)
        setTimeout(() => {
            onClickItem(props.getStartIndex(items, history), 'reset history')
        })
    }

    function getQuizId(ind = activeInd) {
        let activeItem = items[ind] || {}
        let quizId = activeItem?.opts?.quiz;
        return quizId;
    }


    let extendHistory = (activeInd, data, data2) => {
        console.log("qqqqq activeItem", activeItem);
        let quizId = getQuizId();
        let _history = {...history || {}, [quizId]: {...history[quizId] || {}, ...data}};

        setHistory(_history)
        return _history;
    }

    let onSetStartCd = (_activeInd = activeInd) => {
        let quizId = getQuizId(_activeInd);
        if (!quizId) {
            return;
        }
        history[quizId] = history[quizId] || {};

        if (history[quizId].cd) {
            return;
        }
        history[quizId].cd = history[quizId].cd || new Date().getTime();
        setHistory({...history})
        props.onChangeHistory && props.onChangeHistory({history}, quizId)

    }
    let onClickItem = (ind, key) => {
        console.log("qqqqq qqq ON LOCAL CLICK ITME", ind , key);
        if (ind == -1) {
            onFinal()
            return;
        }
        lastToggle = new Date().getTime();
        let tm = timers[ind];
        console.log("qqqqq timersssss", timers, tm);
        setProcess(false)
        if (isExam && tm && tm.time < 1) {
            console.log("qqqqq timersssss false", timers, tm);
            // activeEl.current.onTimeOut && activeEl.current.onTimeOut()
        } else {
            // timers[ind].time = timers[ind].totalTime;
            // setTimers({...timers})
            // setProcess(true)
        }

        setTimeoutIteration(++timeoutIteration)
        setActiveInd(-1)
        setTimeout(() => {
            setActiveInd(ind)
        })
    }

    function onNext(_opts) {
        console.log("qqqqq on EEEEEEEEEEEEEEEEE NEXTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT", _opts);

        if (_opts && _opts.onFinal) {
            return onFinal()
        }
        lastToggle = new Date().getTime();

        if (opts.preventOnNext) {
            return;
        }
        let newInd = props.getNextInd(activeInd, items)
        if (newInd == 0) {
            return onFinal()
        }
        onClickItem(newInd, 'onNExt')

    }

    function onFinal() {
        setIsResults(true)
        setActiveInd(0)
    }

    function pubData(data) {
        data.genVariables = genVariables;
        return data;
    }

    function pubItemForShortHTTP(item) {
        return item
    }

    function onSubmit(data) {
        setProcess(false)

        let hist = extendHistory(activeInd, {...data, isProcess: false})
        let info = {
            item: pubItemForShortHTTP(item),
            data: pubData(data),
            timer,
            opts: activeItem.opts,
        }

        global.http.post(props.submitUrl || '/save-quiz-history', info)

        props.onSubmit && props.onSubmit({
            answerType: item.answerType,
            data,
            history: hist, quizId: info?.opts?.quiz,
            opts: info?.opts
        })
    }

    function onChange(v) {
        console.log("qqqqq ON CHANGEvvvvvvv", v);
        let data = pubData(v.data || {})
        let hist = extendHistory(activeInd, {...data})

        let info = {
            item: pubItemForShortHTTP(item),
            timer,
            data,
            titleInfo: v.titleInfo,
            opts: activeItem.opts || {}
        }
        info = props.preSendFBAQ ? props.preSendFBAQ(info) : info;

        console.log("qqqqq data3333333333333", data.hash,  v.sendKey, data.rate, v);

        data && global.http.post(props.changeUrl || '/set-quiz-history-fbaq', info)
        if (!data) {
            console.log("qqqqq DATA IS NOT SENT SO DONT SEND ON SERVER SIDE",);
        }
        props.onChange && props.onChange({
            answerType: item.answerType,
            data,
            history: hist, quizId: info?.opts?.quiz, opts: info?.opts
        })
    }

    function onReStartAttempt(data, activeInd) {

        onStart(data, activeInd, true)
        // console.log("qqqqq on RESTART ATTEMPT", );
        //
        // let time = props.getDefaultQuizTime(item);
        // timers[activeInd] = {time, totalTime: time};
        // setTimers({...timers})
        // props.onReStartAttempt && props.onReStartAttempt(data, activeInd)
        // onStart(data, activeInd, true)
        // setProccess(true)
    }


    function onStart(data, _activeInd, isRestart) {
        console.log("qqqqq ON LOCAL START", globalActiveInd, _activeInd, isRestart);
        if (globalActiveInd != activeInd) {
            return;
        }
        let quizId = getQuizId()
        if (!quizId) {
            return;
        }
        stopAnyPlay('onStart')
        onSetStartCd();

        if (isRestart) {
            let totalTime = (props.getStartTimers()[activeInd] || {}).totalTime
            let time = totalTime || props.getDefaultQuizTime(item);
            timers[activeInd] = {time, totalTime: time};
            setTimers({...timers})
        }

        setTimeoutIteration(++timeoutIteration)
        extendHistory(activeInd, {isProcess: true})
        setProcess(true)
        props.onStart && props.onStart({quizId: (items[activeInd] || {}).opts?.quiz})
    }

    function onStopTimer() {
        console.log("qqqqq ON LOCAL START", );
        extendHistory(activeInd, {isProcess: false})
        setProcess(false)
        props.onStop && props.onStop({activeInd})
    }

    function getStartTime() {
        let time = props.getDefaultQuizTime(item);
        return {time, totalTime: time, deltaPerc: 100 / time, perc: 100};
    }

    let activeEl = useRef();
    let {opts, maxAttemptsCount} = props || {}
    let activeItem = items[activeInd] || {};
    let item = activeItem.item || {};
    item.answerType = item.answerType || 'quiz'
    let {answerType} = item;
    let hist = history[getQuizId()] || {};

    timers[activeInd] = timers[activeInd] || getStartTime()
    let timer = timers[activeInd];
    let isActive = process;
    let isErrRec = timer.perc < 30 && timer.time > -1;

    if (isResults) {
        let Result = props.Result;
        if (!Result) {
            return null;
        }
        return <>
            <Result history={history} timers={timers} items={items} opts={opts}></Result>
        </>
    }
    let {isExam, woTopCircleNavigation, woNext} = opts || {};

    let EXT_OBJ = {
        onReStartAttempt: onReStartAttempt,
        onStart: onStart,
        onStop: onStopTimer,
        onNext: onNext,
        onSubmit: onSubmit,
        onChange: onChange,

        getCodeFiles: props.getCodeFiles,
        getStartAudioAttempt: props.getStartAudioAttempt,
        getItemNameAndDesc: props.getItemNameAndDesc,
        attemptsForNextIfNot5: props.attemptsForNextIfNot5,
        isActive,
        history,
        item,
        ref: activeEl,
        activeInd,
        isExam,
        opts: props.opts,
        time: Math.round(timer.time),
        timeSpent: timer.totalTime - timer.time,
        hist: history[getQuizId()],
        quizId: getQuizId(),
    }

    // if (EXT_OBJ.time == 0) {
    //     setProcess(false)
    // }

    let isFast = (new Date().getTime() - lastToggle) < 400;

    let canClickDot = !opts.woClickTopCircleNavigation;
    console.log("qqqqq TERAIN RENDER", EXT_OBJ, history);

    return <div>
        <DebugLogs>
            ErrRec: {isErrRec ? 'TRUE' : 'FALSE'}
            _id: {item._id}
            activeInd: {activeInd},
            Qustion: {item.question}
            <div></div>
            {isActive ? 'active' : 'stop'}{' '}
            {process ? 'ProcessActive' : 'ProcessStop'}
            <div></div>
            <div className="ib">Time: {timer.time}</div>
            <div></div>
        </DebugLogs>
        <div className="tc">
            {activeInd + 1} из {opts?.quizesLength}
        </div>
        {/*{!woTopCircleNavigation && (items || []).map((it, ind) => {*/}
        {/*    let hist = history[getQuizId(ind)] || {};*/}
        {/*    // correctDot*/}
        {/*    // incorrectDot*/}
        {/*    return (<div*/}
        {/*        style={{cursor: !canClickDot ? 'default' : 'pointer'}}*/}
        {/*        onClick={() => {*/}
        {/*            if (canClickDot) {*/}
        {/*                onClickItem(ind, 'manual')*/}
        {/*            }*/}
        {/*        }}*/}
        {/*        key={ind}*/}
        {/*        className={'dotsPreview ' + (activeInd == ind ? ' active' : '') + (hist.isSubmit ? (isExam ? 'active' : hist.isCorrect ? ' correctDot' : ' incorrectDot') : '')}>*/}
        {/*    </div>)*/}
        {/*})}*/}


        <div className={'trainContent ' + (isErrRec ? ' timerErrorWrap' : '')}>

            {/*<div>PERC: {timer.time} / {timer.totalTime}</div>*/}
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
                    console.log("qqqqq AUIDO SHORT!! COUNTDOWN SUBMITTTTT STOPPPPPP", hist, history[activeInd], history, activeEl.current);
                    if (hist.isSubmit) return
                    setTimers({...timers, [activeInd]: {...timers[activeInd], time: -1, perc: 0}})
                    activeEl.current?.onTimeOut && activeEl.current?.onTimeOut();
                }}
                hideValue={true}
                totalTime={timer.totalTime}
                count={timer.time}
                iteration={timeoutIteration}
                active={isActive}
                onChange={(time, perc) => {
                    //console.log("qqqqq on trigger timer Change", time, perc);
                    timers[activeInd] = {...timers[activeInd], time, perc};
                    setTimers({...timers})
                    props.onChangeTime && props.onChangeTime(time, timers, activeInd)
                }}
            ></CountDownSecs>
        </div>


    </div>
}


let fakeData = [

    {
        answerType: 'quiz',
        name: 'В чем суть квизов?',
        question: 1224,
        quiz: 999,
        time: 1,
        variations: [
            {name: 'v1', isCorrect: true},
            {name: 'v2', isCorrect: false},
            {name: 'v3', isCorrect: false},
        ]
    },
    {
        answerType: 'quiz', name: 'В чем суть квизов222?',
        question: 1034,
        quiz: 997,

        time: 1,
        variations: [
            {name: 'v1', isCorrect: false},
            {name: 'v2', isCorrect: true},
            {name: 'v3', isCorrect: false},
        ]
    },

]
export default Train
