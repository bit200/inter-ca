import React, {forwardRef, useEffect, useImperativeHandle, useState} from "react";
import _ from "underscore";

import {Link, Outlet} from "react-router-dom";
import MDEditor from "@uiw/react-md-editor";
import "./QuizPreview.css";
import {CountDownSecs} from "./../TrainMethods/CoundDownSec";

let onNextTimer;
global._setAdminMode = (v) => {
    localStorage.setItem("adminMode", v);
};

let Layout2 = forwardRef((props, ref) => {
    let [disabledMs, setDisabledMS] = useState(null);
    let [chosen, setChosen] = useState({}); //{2: true}
    let [_isSubmit, setIsSubmit] = useState(false);
    let [isCorrect, setIsCorrect] = useState(false);
    let [titleInfo, setTitleInfo] = useState({});
    let {skipBottomOpenText, hist, onSubmit, isExam, item, opts = {}, history, getItemNameAndDesc} = props;

    let quiz = item;
    let isSubmit = _.size(hist?.chosen || {}) > 0

    useEffect(() => {
        let info = props.getItemNameAndDesc(item, props)
        setTitleInfo(info)
        let hist = props.hist;
        let {chosen, data} = hist || {};
        setChosen({...chosen || {}})
        setIsSubmit(false)
        setIsCorrect(false)
        console.log("qqqqq qqq ON LOCAL STARTTTTTTTTTTTTTTTTTT", props.activeInd, isSubmit, chosen, hist);

        if (chosen || isSubmit) {
            setIsSubmit(true)
            return;
        }
        setTimeout(() => {
            props.onStart && props.onStart({}, props.quizId)
        })
        // setChosen({2: true})
        // setAttempts(props.getStartAudioAttempt ? props.getStartAudioAttempt(props.activeInd) : 0)
        // playAndStart(info)
    }, [props.quizId])
    console.log("qqqqq onNextQuizTimer!!!!", props.onNextQuizTimer);

    function _onSubmit(chosen, _opts) {
        console.log("qqqqq onNextTimer onSubmit",);
        let {variations = []} = quiz || {};
        _opts.correctAnswer = pubName(variations.find(it => it.isCorrect))
        _opts.selectedAnswer = pubName(variations[Object.keys(chosen).filter(it => chosen[it])[0]])
        _opts.selectedInd = Object.keys(chosen)[0];

        let isCorrect = _opts?.isCorrect;

        let {quizOpenNextIfCorrectMs, quizOpenNextIfIncorrectMs, quizOpenNextExam} = opts;
        let time = isExam ? quizOpenNextExam || 100 :
            isCorrect ? quizOpenNextIfCorrectMs : quizOpenNextIfIncorrectMs;


        setDisabledMS(time)
        setIsCorrect(isCorrect)

        if ((isCorrect || isExam) && props.onNextQuizTimer && !_opts.isTimeout) {
            let _quiz_id = props.quizId
            setTimeout(() => {
                if (_quiz_id != props.quizId) {
                    return;
                }
                props.onNext && props.onNext()
            }, props.onNextQuizTimer)
        }
        // onNextTimer = time && setTimeout(() => {
        //     console.log("qqqqq onNextTimer COMPLETEEEEE",);
        //     // props.onNext && props.onNext(isExam ? null : {onFinal: !isCorrect});
        // }, time)
        // console.log("qqqqq ON SonNextTimer", onNextTimer, time);

        props.onSubmit && props.onSubmit({data: _opts, chosen, time});


        function pubName(it) {
            return it ? it.name || '' : ''
        }
    }

    function onClickVariant(ind) {
        let it = (quiz?.variations || [])[ind] || {}
        chosen = chosen || {}
        chosen = {[ind]: true};
        setChosen({...chosen});
        setIsSubmit(true);
        _onSubmit && _onSubmit(chosen, {isCorrect: it.isCorrect});
    }

    function onTimeOut() {
        //console.log("qqqqq click inside child",);
        let ind = 999;
        chosen = {[ind]: true};
        setChosen({...chosen});
        setIsSubmit(true);
        _onSubmit && _onSubmit(chosen, {
            isCorrect: false, isTimeout: true
        });
    }

    useImperativeHandle(ref, () => ({
        onTimeOut
    }));

    let {smallTitle, title, desc} = titleInfo || {};
    let isAdminMode = !isExam && localStorage.getItem("adminMode") == "1";
    let {preventOnNext} = opts || {};
    let isTimeout = hist?.data?.isTimeout;
    console.log("qqqqq aaaaaasdfasdfasdf",{preventOnNext ,skipBottomOpenText ,isSubmit, isCorrect, isExam} );
    console.log("qqqqq IS SUBMIT", hist, isSubmit, opts.canResubmitQuiz);
    return (<div
            className={
                "quiz-preview animChilds " + (!isExam && isSubmit ? "submitted" : "nonSubmitted")
            }
        >
            {/*Quiz Preview*/}


            <div className="quiz-submit-title no-select">
                <small>{smallTitle}</small>
                <MDEditor.Markdown source={title}/>
                <MDEditor.Markdown source={desc}/>
            </div>
            {isTimeout && <div className="alert alert-danger shadow-sm" style={{marginTop: '20px'}}>
                Вышло время, ответ не будет засчитан
            </div>}
            {/*<div*/}
            {/*    style={{*/}
            {/*        width: "100%",*/}
            {/*        marginTop: "20px",*/}
            {/*        marginBottom: "20px",*/}
            {/*        borderBottom: "1px solid #efefef",*/}
            {/*    }}*/}
            {/*></div>*/}
            <hr/>
            {(item.variations || []).map((it, ind) => {
                let clName;
                if (chosen[ind]) {
                    clName = isExam ? "unknown" : it.isCorrect ? "correct" : "incorrect";
                }
                if (!isExam && isSubmit && it.isCorrect) {
                    clName = props.isGreyForCorrect ? "unknown" : "correct";
                }
                return (
                    <div
                        key={ind}
                        className={"quiz-answer-it no-select  " + clName}
                        onClick={() => {

                            if (isSubmit && !opts.canResubmitQuiz) {
                                return;
                            }
                            onClickVariant(ind)

                        }}
                    >
                        <div className="quiz-answer-it-radio"></div>
                        <MDEditor.Markdown
                            source={(isAdminMode && it.isCorrect ? "** " : " ") + it.name}
                        />
                    </div>
                );
            })}
            {/*{!disabledMs && isSubmit && <>*/}
            {/*    <hr/>*/}
            {/*    <Button color={4} onClick={(cb) => {*/}
            {/*        cb && cb()*/}
            {/*        props.onNext && props.onNext()*/}
            {/*    }}>Идти дальше</Button>*/}
            {/*</>}*/}
            {!preventOnNext && !skipBottomOpenText && isSubmit && <div>
                <hr/>
                {/*{t('nextQuizOpenAfter')} {Math.round(disabledMs / 1000)}{t('secondsShort')}.*/}
                {(isCorrect || isExam) && <Button
                    style={{marginLeft: '5px'}}
                    onClick={(scb) => {
                        scb && scb()
                        clearTimeout(onNextTimer)
                        props.onNext && props.onNext();
                    }}>{t('openNowNew')}333</Button>}
                {!isExam && !isCorrect && <Button
                    style={{marginLeft: '5px'}}
                    onClick={(scb) => {
                        scb && scb()
                        console.log("qqqqq onNextTimer", onNextTimer);
                        clearTimeout(onNextTimer)
                        props.onNext && props.onNext({onFinal: true});
                    }}>{t('openNowNew')}</Button>}
            </div>}

            {/*{cdPerc} {disabledMs}*/}
            {/*{disabledMs && <CountDownSecs*/}
            {/*    onChange={(time, perc) => {*/}
            {/*       //console.log("qqqqq on CHNGAGTGEGEG", );*/}
            {/*        setCDPerc(perc)*/}
            {/*    }}*/}
            {/*    totalTime={Math.round(disabledMs / 1000)}*/}
            {/*></CountDownSecs>}*/}
        </div>
    );
})

export default Layout2;
