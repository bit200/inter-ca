// import React, {useEffect, useState} from 'react';
// import Train from "./Train";
// import QuestionDetails from "../Suggest/QuestionDetails";
// import {QuestionDetailsNew} from "../Suggest/PreviewCourseModule";
//
//
// function Layout2(props) {
//     let [history, setHistory] = useState(null)
//     let [trainHist, setTrainHist] = useState({})
//
//     useEffect(() => {
//         // loadHistory();
//         loadInterviewHistory()
//     }, [])
//     let feedbackHistoryId = 1192;
//
//
//     let hist0 = (history || [])[0]
//     function loadInterviewHistory() {
//         setTimeout(() => {
//
//             setHistory([
//                 {
//                     // "_id": 1038,
//                     // "quiz": 1038,
//                     // "question": 1224,
//                     // "answerType": "audio",
//                     // "name": "sdafasdfasdfasdf",
//                     // "time": 180
//                     _id: 1002,
//                     answerType: "audio",
//                     name: 'aaaaa22222222',
//                     time: 200,
//                     question: 1224,
//                     opts: {subQuestion: 1007, isExam: true},
//                     historyDetails: [
//                         {
//                             name: 'В чем суть хок компонент',
//                             answer: 'xxxxxxxxxxxxx222222',
//                             hash: 11112244444,
//                         }
//                     ]
//
//                 }
//             ])
//         }, 500)
//
//     }
//
//
//     function loadHistory() {
//         global.http.get('/load-my-quiz-history-details', {_id: feedbackHistoryId}).then(r => {
//             r.time = r.totalTime;
//             setHistory([r])
//         })
//     }
//
//     function sendFeedback() {
//         global.http.get('/send-user-quiz-feedback', {_id: hist0._id, hash: trainHist?.data?.hash}).then(r => {
//            //console.log("qqqqq csaveddddddd", r);
//         })
//     }
//    //console.log("qqqqq history", history);
//
//     // let v = useActionData();
//     return <div>
//         {history?._id}
//         <button onClick={() => {
//             sendFeedback()
//         }}> Теперь все хорошо, отправить на проверку!
//         </button>
//         <Train
//             getNextInd={(ind, items) => {
//                 return ++ind % items.length;
//             }}
//             getItemNameAndDesc={(item, props) => {
//                 console.log("qqqqq GET TITLE & NAME [[ ", item, props);
//
//                 return {
//                     lng: '',
//                     smallTitle: 'small Title',
//                     title: item.name + '222',
//                     desc: 'item.name MD description !!!'
//                 }
//             }}
//             getCodeFiles={(item) => {
//                 return {
//                     activeFileInd: 0,
//                     items: [{
//                         name: 'test.js',
//                         defCode: 'start333',
//                         code: 'Start code',
//                         language: 'javascript'
//                     }, {
//                         name: 'test.html',
//                         defCode: 'start',
//                         code: 'Start code',
//                         language: 'html'
//                     }]
//                 }
//             }}
//             getStartAudioAttempt={(ind) => {
//                 console.log("qqqqq GET START Audio Attempt [[ ", ind);
//                 return 0;
//             }}
//             getStartIndex={() => {
//                 // console.log("qqqqq GET START Index [[ ", 1);
//                 return 0;
//             }}
//             getStartHistory={() => {
//                 return {
//                     0: {chosen: {2: true}}
//                 }
//             }}
//             onChangeTime={(time, timers, activeInd) => {
//                 // console.log("qqqqq CHANGE TIME", time, timers, activeInd);
//             }}
//             getStartTimers={() => {
//                 console.log("qqqqq GET START TIMERS [[ ",);
//                 return {
//                     0: {
//                         time: 180, totalTime: 200,
//                     },
//                     1: {
//                         time: 50, totalTime: 200
//                     }
//                 }
//             }}
//             getDefaultQuizTime={(item) => {
//                 let {answerType} = item;
//                 return answerType === 'audio' ? 120 :
//                     answerType === 'quiz' ? 15 :
//                         answerType == 'code' ? 60 : 20
//             }}
//             getStartItems={async () => {
//                 console.log("qqqqq GET START ITEMS [[ ", _quizes);
//                 return _quizes
//             }}
//             onResult={(history) => {
//                 console.log("qqqqq ON RESULT course Quiz", history);
//                 setQuizResults(true)
//                 return null
//             }}
//             onChange={(v) => {
//                 console.log("qqqqq ON CHANGE course QUIZ", v);
//                 let {data = {}, answerType} = v;
//                 let {quizPerc, total} = getQuizPerc(v)
//                 //console.log("qqqqq quiz Perc ]]] ", quizPerc, total, v);
//                 setQuizPerc(quizPerc);
//                 if (answerType === 'quiz' && !data.isCorrect) {
//                     setQuizResults(true)
//                 }
//             }}
//             onSubmit={(v) => {
//                 console.log("qqqqq ON SUBMIT course QUIZ", v);
//             }}
//             onStart={(v) => {
//                 console.log("qqqqq ON START course QUIZ", v);
//             }}
//             onReStart={(v) => {
//                 console.log("qqqqq ON RE_START course QUIZ", v);
//             }}
//             onStop={(v) => {
//                 console.log("qqqqq ON STOP on Stop", v);
//             }}
//
//             Result={null}
//
//             opts={{
//                 startWebCam: false,
//                 preventOnNext: false,
//                 textToVoiceTimeoutMS: 1,
//                 textToVoiceSpeedMSPerSymbolLimit: 0,
//                 msForRecognitionInnerProcess: 1000,
//                 playTextSpeechBeforeQuiz: true,
//                 showGrowTags: false,
//                 playTextSpeechAfterAudioRecord: true,
//                 woNext: false,
//                 isExam: true,
//                 woTopCircleNavigation: false,
//                 MSBeforeAudioStart: 100,
//                 isErrRec: true,
//                 quizExam: 600,
//                 quizOpenNextExam: 600,
//                 quizOpenNextIfCorrectMs: 600,
//                 quizOpenNextIfIncorrectMs: 5000,
//                 maxAttemptsCount: 5,
//                 attemptsForNextIfNot5: 2
//             }}
//         >
//         </Train>
//     </div>
// }
//
// function Result2(props) {
//     return <>
//         <hr/>
//         Result pge 2</>
// }
// function Result(props) {
//     let [activeInd, setActiveInd] = useState(0)
//     let {items, history, timers} = props;
//     let activeItem = items[activeInd] || {};
//    //console.log("qqqqq propssss RESULT PAGE", props, activeItem);
//
//     function getGoodCount() {
//         let count = 0;
//         _.each(history, (item, ind) => {
//             if (item.isCorrect) {
//                 count++
//             }
//             if (item.rate == 5) {
//                 count++
//             }
//         })
//
//         return count;
//
//
//     }
//
//
//     return <div>
//         <div style={{fontSize: '24px', marginBottom: '10px'}}>Результаты</div>
//
//         <div>Отвечено на 5: {getGoodCount()}</div>
//         <div>Всего вопросов: {items.length}</div>
//         <Button onClick={(cb) => {
//             cb && cb()
//             window.reloadTrain && window.reloadTrain()
//         }}>Перезапустить тренировку</Button>
//         <hr/>
//         <div className="row">
//             <div className="col-sm-4">
//                 {(items || []).map((it, ind) => {
//                     return (<div key={ind} onClick={() => {
//                         setActiveInd(ind)
//                     }}>
//                         {it.name}
//                     </div>)
//                 })}
//             </div>
//             <div className="col-sm-8">
//                 <QuestionDetailsNew
//                     answerSubType={'results'}
//                     withoutShow={true} showName={true}
//                     // question={activeItem}
//                     questionId={activeItem.question}
//                 ></QuestionDetailsNew>
//
//                 {/*<QuestionDetails*/}
//                 {/*    */}
//                 {/*    questionId={activeItem.question}></QuestionDetails>*/}
//             </div>
//         </div>
//
//
//     </div>
// }
//
//
// export default Layout2
