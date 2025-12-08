import React, {useState, useEffect} from 'react';
import Train from "./Train";
import {getDefaultQuizTime, getLng,getStartTimers, pubGeneralTitle, getQuizName, getQuizAnyName} from "../RunExam";

function Layout2(props) {
    let opts = props.opts;
    let {loading, quizes, question} = opts;
    //console.log('*........ ## ROOT RENDER', props);
    
    useEffect(() => {
        console.log("qqqqq UPDATE !!!!!!!!!!!!!!!!!", );
    }, [])

    if (loading) {
        return <div>Loading ...</div>
    }
    let Res = props.Result;
    console.log("qqqqq quizes44441111", props, opts);
    // let v = useActionData();
    if (!quizes.length) {
        return <div className={'tc'} style={{padding: '40px'}}>
            <div style={{fontSize: '24px'}}>На данный момент вы повторили все задания
            </div>
            <div>
                Откройте больше модулей в курсах (в разделе изучения) чтобы здесь появлялось больше интерсных задач
            </div>
            <div>
                
            </div>
        </div>
    }
    console.log("qqqqq optssssssssssssssssss", opts);
    return <div>
        {/*<Train*/}
        {/*    isExam={opts.isExam}*/}
        {/*    quizOpenNextIfCorrectMs={600}*/}
        {/*    quizOpenNextIfIncorrectMs={5000}*/}
        {/*    maxAttemptsCount={5}*/}
        {/*    opts={opts}*/}
        {/*    // url={'/exam-load'}*/}
        {/*    getItems={async () => {*/}
        {/*        return quizes*/}
        {/*    }}*/}
        {/*    onResult={props.onResult}*/}
        {/*    Result={Res || Result2}*/}
        {/*    onChange={(v) => {*/}
        {/*        // setTrainHist(v)*/}
        {/*    }}*/}
        {/*>*/}
        {/*</Train>*/}


        <Train
            onNextQuizTimer={500}
            getNextInd={(ind, items) => {
                return ++ind % items.length;
            }}
            preSendFBAQ={(info) => {
                console.log("qqqqq info", info);
                info.opts = info.opts || {};
                // info.opts.exam = exam._id;
                return info;
            }}
            getItemNameAndDesc={(item, props) => {
                console.log("qqqqq GET TITLE & NAME [[ ", item, props);
                // let smallTitle = item.specialType != 'general' ? getGeneralTitle(item) : ''
                return pubGeneralTitle(item)
            }}
            getCodeFiles={(item, hist, isRestart) => {
                console.log("qqqqq histtttttttttttt", item, hist);
                let values = (hist || {}).values || [];

                function pubItem(item, ind) {
                    if (!isRestart) {
                        item.code = (values[ind] || {}).code || item.code;
                    }
                    item.lng = getLng(item.name)
                    // item.code = replaceCode(item.code)
                    return item
                }

                return {
                    activeFileInd: 0,
                    items: (item.files || []).map(pubItem)
                }
            }}
            getStartAudioAttempt={(ind) => {
                console.log("qqqqq GET START Audio Attempt [[ ", ind);
                return 0;
            }}

            getStartHistory={() => {
                return {}
                // let hist = (((history || {})[-1] || {}).quizHistory || {}).history;
                // console.log("qqqqq cHHHHHHHHHHHHHHHHHHHHHHHH quizzzzzzzzzzzzzzzzzzzzz!!", hist, history);
                // //START HISTORY __________
                // // return {};
                // return hist || {};
            }}
            onChangeTime={(time, timers, activeInd) => {
                // console.log("qqqqq CHANGE TIME", time, timers, activeInd);
            }}
            getStartTimers={getStartTimers}
            getDefaultQuizTime={getDefaultQuizTime}

            onResult={(history) => {
                console.log("qqqqq ON RESULT course Quiz ]]", history);
                // setQuizResults(true)
                props.onResult && props.onResult();
                return null
            }}
            onChangeHistory={(quizHistory) => {
                // if (!quizHistory.quizId) return;
                // console.log("qqqqq vvvv445", history, quizHistory)
                // let questionId = -1
                // history[questionId] ??= {}
                // history[questionId].quizHistory = quizHistory;
                // setHistory(history)
                // console.log("qqqqq ON CHANGE HISTORY QUIZ ]]", quizHistory);
                // updateExam(history[questionId], questionId)
            }}
            onChange={(quizHistory, v) => {
                console.log("qqqqq ON CHANGE QUIZ ]]", quizHistory);
                // let {data = {}, answerType} = v;
                // let questionId = -1
                // history[questionId] ??= {}
                // history[questionId].quizHistory = quizHistory;
                // setHistory(history)
                // updateExam(history[questionId], questionId)
                // let {quizPerc, total} = getQuizPerc(v)
                // //console.log("qqqqq quiz Perc ]]] ", quizPerc, total, v);
                // setQuizPerc(quizPerc);
                // if (answerType === 'quiz' && !data.isCorrect) {
                //     setQuizResults(true)
                // }
                props.onChange && props.onChange(quizHistory, v)
            }}
            onSubmit={(quizHistory, v) => {
                console.log("qqqqq ON SUMBIT ]] ", quizHistory);
                props.onChange && props.onChange(quizHistory, v)

            }}
            onReStartAttempt={(v) => {
                console.log("qqqqq ON RESTART_ATTEMPT course QUIZ ]]", v);
            }}
            onStart={(v) => {
                console.log("qqqqq ON START course QUIZ ]]", v);
            }}
            onReStart={(v) => {
                console.log("qqqqq ON RE_START course QUIZ ]]", v);
            }}
            onStop={(v) => {
                console.log("qqqqq ON STOP on Stop ]]", v);
            }}
            getStartItems={async () => {
                console.log("qqqqq GET START ITEMS [[ ", props);
                if (props.getStartItems) {
                    return props.getStartItems();
                }
                return props?.opts?.quizes || props?.quizes || []
            }}
            getStartIndex={(items, history) => {
                // console.log("qqqqq GET START Index [[ ", 1);
                return 0;
            }}
            Result={props.Result}
            opts={{
                uploadAudioUrl: '/api/upload-audio',
                codeChangeUrl: '/code-typing',
                plainCodeChangeUrl: '/code-typing',
                isExam: opts.isExam,
                woClickTopCircleNavigation: true,
                woTopCircleNavigation: false,
                // resetTimeOnClickItem: true,

                woUploadAudio: false,
                startWebCam: false,
                preventOnNext: false,
                quizesLength: quizes?.length,
                playTextSpeechBeforeQuiz: true,
                textToVoiceTimeoutMS: 0,
                textToVoiceSpeedMSPerSymbolLimit: 100,
                msForRecognitionInnerProcess: 1000,
                playTextSpeechAfterAudioRecord: true,
                canResubmitQuiz: false,
                showGrowTags: false,
                woNext: false,

                debugCompareRateOnCodeChange: true,

                MSBeforeAudioStart: 100,
                isErrRec: true,
                quizExam: 600,
                quizOpenNextExam: 600,
                quizOpenNextIfCorrectMs: 500,
                quizOpenNextIfIncorrectMs: 5000,
                maxAttemptsCount: 5,
                attemptsForNextIfNot5: 2,

            }}
        >
        </Train>

    </div>
}


function RestulExamPage(props) {
    console.log("qqqqq RESULTS EXAM PAGE propsssss4444444444", props);
    return <>
        RESULTS EXAM PAGE
    </>
}

export default Layout2
