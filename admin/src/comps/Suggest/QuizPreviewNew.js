import React, {forwardRef, useEffect, useImperativeHandle, useState} from "react";
import _ from "underscore";

import {Link, Outlet} from "react-router-dom";
import MDEditor from "@uiw/react-md-editor";
import "./QuizPreview.css";
import {CountDownSecs} from "./../TrainMethods/CoundDownSec";
import {checkQuizOnServer, isCorrectVariant, quizAnswerPayload} from "./quizServerCheck";

let onNextTimer;
global._setAdminMode = (v) => {
    localStorage.setItem("adminMode", v);
};

let QuizPreviewNew = forwardRef((props, ref) => {
    let [disabledMs, setDisabledMS] = useState(null);
    let [chosen, setChosen] = useState({}); //{2: true}
    let [_isSubmit, setIsSubmit] = useState(false);
    let [isCorrect, setIsCorrect] = useState(false);
    let [titleInfo, setTitleInfo] = useState({});
    let [correctIdx, setCorrectIdx] = useState(null); // правильные индексы с сервера
    let [isChecking, setIsChecking] = useState(false);
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
        setCorrectIdx(null)
        setIsChecking(false)
        console.log("qqqqq qqq ON LOCAL STARTTTTTTTTTTTTTTTTTT", props.activeInd, isSubmit, chosen);

        if (chosen || isSubmit) {
            setIsSubmit(true)
            return;
        }
        props.onStart && props.onStart({}, props.activeInd)
        // setChosen({2: true})
        // setAttempts(props.getStartAudioAttempt ? props.getStartAudioAttempt(props.activeInd) : 0)
        // playAndStart(info)
    }, [props.activeInd])

    function _onSubmit(chosen, _opts) {
        console.log("qqqqq onNextTimer onSubmit", );
        let {variations = []} = quiz || {};
        let correctIndexes = _opts.correctIndexes;
        _opts.correctAnswer = pubName(variations.find((it, ind) => isCorrectVariant(it, ind, correctIndexes)))
        _opts.selectedAnswer = pubName(variations[Object.keys(chosen).filter(it => chosen[it])[0]])

        let isCorrect = _opts?.isCorrect;

        let {quizOpenNextIfCorrectMs, quizOpenNextIfIncorrectMs, quizOpenNextExam} = opts;
        let time = isExam ? quizOpenNextExam || 100 :
            isCorrect ? quizOpenNextIfCorrectMs : quizOpenNextIfIncorrectMs;


        setDisabledMS(time)
        setIsCorrect(isCorrect)

        onNextTimer = time && setTimeout(() => {
            console.log("qqqqq onNextTimer COMPLETEEEEE", );
            props.onNext && props.onNext(isExam ? null : {onFinal: !isCorrect});
        }, time)
        console.log("qqqqq ON SonNextTimer", onNextTimer, time);

        props.onSubmit && props.onSubmit({data: _opts, chosen, time});


        function pubName(it) {
            return it ? it.name || '' : ''
        }
    }

    async function onClickVariant(ind) {
        chosen = {[ind]: true};
        setChosen({...chosen});
        setIsSubmit(true);
        setIsChecking(true);
        // верность ответа решает сервер, в данных квиза её может не быть
        let res = await checkQuizOnServer(quiz, [ind]);
        setIsChecking(false);
        setCorrectIdx(res.correctIndexes);
        _onSubmit && _onSubmit(chosen, {
            isCorrect: res.isCorrect,
            correctIndexes: res.correctIndexes,
            checkAnswer: quizAnswerPayload(quiz, [ind]),
        });
    }

    function onTimeOut() {
        //console.log("qqqqq click inside child",);
        let ind = 999;
        chosen = {[ind]: true};
        setChosen({...chosen});
        setIsSubmit(true);
        checkQuizOnServer(quiz, []).then(res => {
            setCorrectIdx(res.correctIndexes);
            _onSubmit && _onSubmit(chosen, {
                isCorrect: false, isTimeout: true, correctIndexes: res.correctIndexes
            });
        });
    }

    useImperativeHandle(ref, () => ({
        onTimeOut
    }));

    let {smallTitle, title, desc} = titleInfo || {};
    let isAdminMode = !isExam && localStorage.getItem("adminMode") == "1";
    let {preventOnNext} = opts || {};
    let isTimeout = hist?.data?.isTimeout;
    let correctIndexes = correctIdx || hist?.data?.correctIndexes || null;
    // console.log("qqqqq IS SUBMIT", hist, isSubmit, opts.canResubmitQuiz);
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
                    clName = isExam ? "unknown" : isCorrectVariant(it, ind, correctIndexes) ? "correct" : "incorrect";
                }
                if (!isExam && isSubmit && isCorrectVariant(it, ind, correctIndexes)) {
                    clName = props.isGreyForCorrect ? "unknown" : "correct";
                }
                return (
                    <div
                        key={ind}
                        className={"quiz-answer-it no-select  " + clName}
                        data-testid={'quiz-answer'}
                        onClick={() => {

                            if (isChecking || (isSubmit && !opts.canResubmitQuiz)) {
                                return;
                            }
                            onClickVariant(ind)

                        }}
                    >
                        <div className="quiz-answer-it-radio"></div>
                        <MDEditor.Markdown
                            source={(isAdminMode && isCorrectVariant(it, ind, correctIndexes) ? "** " : " ") + it.name}
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
            {!preventOnNext && !skipBottomOpenText && isSubmit && disabledMs && <div>
                <hr/>
                {t('nextQuizOpenAfter')} {Math.round(disabledMs / 1000)}{t('secondsShort')}.
                {(isCorrect || isExam) && <a
                style={{marginLeft: '5px'}}
                    onClick={() => {
                    clearTimeout(onNextTimer)
                    props.onNext && props.onNext();
                }}>{t('openNow')}</a>}
                {!isExam && !isCorrect && <a
                    style={{marginLeft: '5px'}}
                    onClick={() => {
                    console.log("qqqqq onNextTimer", onNextTimer);
                    clearTimeout(onNextTimer)
                    props.onNext && props.onNext({onFinal: true});
                }}>{t('openNow')}</a>}
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

export default QuizPreviewNew;
