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
    let [cdPerc, setCDPerc] = useState(0);
    let [disabledMs, setDisabled] = useState({});
    let [chosen, setChosen] = useState({});
    let [isSubmit, setIsSubmit] = useState(false);
    let {quiz, onSubmit, isExam, onClick} = props;
    quiz ??= {};

    useEffect(() => {
        let hist = props.history || {};
        setChosen({...(hist.chosen || {})});
        setIsSubmit(hist.isSubmit);
        !hist.isSubmit && props.onStart && props.onStart()
    }, [quiz._id]);

    // useEffect(() => {
    //     if (props.forceHistory) {
    //         let hist = props.history || {};
    //         setChosen({...(hist.chosen || {})});
    //         setIsSubmit(hist.isSubmit);
    //     }
    // }, [quiz.history]);

    function pubName (it) {
        return it ? it.name || '' : ''
    }


    function _onSubmit(chosen, opts) {
        let {variations = []} = quiz || {};
        opts.correctAnswer = pubName(variations.find(it => it.isCorrect))
        opts.selectedAnswer = pubName(variations[Object.keys(chosen).filter(it => chosen[it])[0]])
        onSubmit && onSubmit(chosen, opts);
       //console.log("qqqqq SUBMITTTTT CLICK VARIANT3", quiz, opts, chosen);

        let isCorrect = opts?.isCorrect;

        let {quizOpenNextIfCorrectMs, quizOpenNextIfIncorrectMs, examOnNextMs} = props;
        let time = isExam ? examOnNextMs || 100 : isCorrect ? quizOpenNextIfCorrectMs : quizOpenNextIfIncorrectMs;

        setDisabled(time)
        setCDPerc(time)

        onNextTimer = time && setTimeout(() => {
            props.onNext && props.onNext();
        }, time)



    }

    function onClickVariant(ind) {
        let it = (quiz?.variations || [])[ind] || {}
        //  chosen[ind] = !chosen[ind];
       //console.log("qqqqq SUBMITTTTT CLICK VARIANT", ind);
        chosen = {[ind]: true};
        setChosen({...chosen});
        setIsSubmit(true);
        _onSubmit && _onSubmit(chosen, {isCorrect: it.isCorrect});

    }

    function timeOut() {
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
        timeOut
    }));

    let {skipBottomOpenText} = props || {};
    let isAdminMode = !isExam && localStorage.getItem("adminMode") == "1";
    // let timer = props.timer || 3;
    // let v = useActionData();
    return (<div
            className={
                "quiz-preview animChilds " + (!isExam && isSubmit ? "submitted" : "nonSubmitted")
            }
        >
            {/*Quiz Preview*/}

            <div className="quiz-submit-title no-select">
                <MDEditor.Markdown source={quiz.name}/>
            </div>
            <div
                style={{
                    width: "100%",
                    marginTop: "20px",
                    marginBottom: "20px",
                    borderBottom: "1px solid #efefef",
                }}
            ></div>
            {(quiz.variations || []).map((it, ind) => {
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
                        className={"quiz-answer-it no-select " + clName}
                        onClick={() => {
                            if (!isExam && isSubmit) {
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
            {!disabledMs && isSubmit && <>
                <hr/>
                <Button color={4} onClick={(cb) => {
                    cb && cb()
                    props.onNext && props.onNext()
                }}>Идти дальше</Button>
            </>}
            {!skipBottomOpenText && isSubmit && disabledMs && <div>
                <hr/>
                След квиз откроется автоматически через {Math.round(disabledMs / 1000)}с. <a onClick={() => {
                    clearTimeout(onNextTimer)
                 props.onNext && props.onNext();

            }}>Открыть сейчас</a>
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
