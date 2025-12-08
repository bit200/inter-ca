import React, {useState, useEffect} from 'react';
import _ from 'underscore';
import Button from 'libs/Button'
import MyModal from 'libs/MyModal'
import './Suggest/quiz.css'
import {
    Link, Outlet
} from "react-router-dom";
import QuizQuestion from './Suggest/QuizQuestion'
import QuestionAnswerDetails from "./QuestionAnswerDetails";
import ExtracterDetailed from "../libs/Extracter/ExtracterDetailed";

let changeStatus = Storage.changeStatus;
let sortQuestions = Storage.sortQuestions;



function QuizGame(props) {
    let {questions, onClose} = props;
    let [cd, setCd] = useState(0)
    let [quizQuestions, setQuizQuestions] = useState(questions)
    let [activeInd, setActiveInd] = useState(0)
    let [isShown, setIsShown] = useState(0)

    useEffect(() => {
        setQuizQuestions(props.questions)
        setActiveInd(0)
       //console.log("qqqqq USE EFFECT RERENDER",);
    }, [props.questions])
    let question = questions[activeInd];
    let modal;

    let isFinal = (activeInd === quizQuestions.length)

    return <div>
        {isFinal && <div>
            {!!quizQuestions.length && <div>
                Все вопросы пройдены, больше нет для повторения!
                <div></div>
                <Link to={'/dashboard'} onClick={(e) => {
                    e && e();
                    onClose && onClose();
                }}>Вернуться в меню</Link>
                <div></div>
                <Link onClick={() => {
                    setActiveInd(0)
                }}>Начать тест заново</Link>
            </div>}
        </div>}
        {!isFinal && <div className={'rel'}>

            {(questions || []).map((it, ind) => {
                return <div key={ind}
                            className={'quiz-circle ' + (ind === activeInd ? ' quiz-active' : '') + (ind < activeInd ? 'quiz-passed' : '')}>

                </div>
            })}
            {!!isShown && <Button className="nextQ next-q-quiz" color={1} size={'xs'} onClick={() => {
                setIsShown(0)
                setActiveInd(activeInd + 1)
            }}>След вопрос</Button>}

            <div style={{height: '20px'}}></div>
            <QuizQuestion question={question} onChange={(q) => {
                questions[activeInd] = q;
                setQuizQuestions([...questions])
                setIsShown(1)
            }
            }></QuizQuestion>
            {!!isShown && <div>

                <QuestionAnswerDetails question={questions[activeInd]} onChange={(q) => {
                    questions[activeInd] = q;
                    setCd(new Date())
                }
                }></QuestionAnswerDetails>
            </div>}
        </div>}
    </div>
}


function Quiz(props) {
    let [id, setId] = useState(Storage.getId())
    let [questions, setQuestions] = useState([])
    let [historyObj, setHistoryObj] = useState([])
    let [quizQuestions, setQuizQuestions] = useState([])
    let [activeInd, setActiveInd] = useState(0)
    // let [isShown, setIsShown] = useState(0)
    let QUIZ_QUESTIONS_LENGTH = 2;
    global.historyObj = historyObj;
    global.setHistoryObj = setHistoryObj;


    useEffect(() => {
        Storage.loadMyQuestions(id, ({questions, history}) => {
            let historyObj = {};
            let query = window.location.href.split('/').slice(-1)[0];
            let queryId = query == +query ? +query : null;
            let queryStatus = !queryId && query !== 'all' ? query : null;

            _.each(history, (item, ind) => {
                historyObj[item.question] = item;
            });

            questions = questions.filter(({hashTags, _id}) => {
                let {status} = historyObj[_id] || {};
                return queryId ? hashTags.indexOf(queryId) > -1 : queryStatus ? ((queryStatus === status) || (queryStatus === 'bad' && !status)) : true
            })

            setQuestions(questions);
            setHistoryObj(historyObj);
            setQuizQuestions([...questions.slice(0, QUIZ_QUESTIONS_LENGTH)])

        })
    }, [])


    questions = sortQuestions(questions, historyObj);
    // let question = questions[activeInd];
    return <div>


        <QuizGame questions={quizQuestions} onClose={() => {
        }}></QuizGame>


        {/*<hr/>*/}
 {/*    {(global.question_statuses || []).map(({status, name}, ind) => {*/}
        {/*        let filtered_items = _.filter(questions, it => {*/}
        {/*            let quest_status = (historyObj[it._id] || {}).status*/}
        {/*           //console.log("qqqqq status", it._id, {status, quest_status}, historyObj);*/}
        {/*            return (status === quest_status) || ((status === 'bad') && !quest_status)*/}
        {/*        });*/}
        {/*        return (<div key={ind} className={'col-sm-3'}>*/}
        {/*            <div className="status-title">*/}
        {/*                {name} [x{filtered_items.length}]*/}
        {/*                <div><Button*/}
        {/*                    size={'xs'}*/}
        {/*                    onClick={(scb) => {*/}
        {/*                    scb && scb()*/}
        {/*                    setQuizQuestions([...filtered_items.slice(0, QUIZ_QUESTIONS_LENGTH)])*/}
        {/*                }}>*/}
        {/*                    Start*/}
        {/*                </Button></div>*/}
        {/*            </div>*/}
        {/*            {(filtered_items || []).map((it, ind) => {*/}
        {/*                return <div key={ind} className={'quiz-status-q'}>*/}
        {/*                    {it.name || '-'}*/}
        {/*                </div>*/}
        {/*            })}*/}


        {/*        </div>)*/}
        {/*    })}*/}
        {/*    <div className="col-sm-12">*/}

        {/*        <hr/>*/}
        {/*        {(questions || []).map((it, ind) => {*/}
        {/*            return (<div key={ind}>*/}
        {/*                {questions && <QuizQuestion*/}
        {/*                    defClass={'small'}*/}
        {/*                    question={it} onChange={(q) => {*/}
        {/*                    questions[ind] = q;*/}
        {/*                    setQuestions([...questions])*/}
        {/*                }*/}
        {/*                }></QuizQuestion>}*/}
        {/*            </div>)*/}
        {/*        })}*/}
        {/*    </div>*/}
        {/*</div>*/}


    </div>
}



export default Quiz
