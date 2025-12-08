import React, {useEffect, useState} from "react";
import Storage from "./CustomStorage";

let {smartFilterSearch} = Storage;

function Questions({selectedQuestionId, urlPrefix, questions = [], onChange, hashTags = []}) {
    // let [allQusetions, setAllQuestions] = useState([])
    // let [questions, setQuestions] = useState([])
    let [search, setSearch] = useState('')
    let [tagQuestions, setTagQuestions] = useState([])
    let [otherQuestions, setOtherQuestions] = useState([])
    let [selectedQuestion, setSelectedQuestion] = useState({})


    useEffect(() => {
        let tagsObj = hashTags.reduce((acc, it) => {
            return {...acc, [it]: true}
        }, {});
        let isEmptyTagsLeng = !hashTags.length;
        const otherQuestions = [];
        const tagQuestions = [];

        questions.forEach((question) => {
            let isOK = isEmptyTagsLeng || question.hashTags.some((tag) => tagsObj[tag]);

            if (isOK) {
                tagQuestions.push(question);
            } else {
                otherQuestions.push(question);
            }
        });


        setSelectedQuestion(questions.filter(it => it._id == selectedQuestionId)[0])
        setTagQuestions(smartFilterSearch(search, tagQuestions))
        setOtherQuestions(smartFilterSearch(search, otherQuestions))
    }, [search, questions.length, hashTags.join(', '), selectedQuestionId])

    return <>
        <input className="pull-right input-xs" style={{width: '200px'}}
               value={search}
               placeholder="Поиск по вопросам"
               onChange={(e) => {
                   setSearch(e.target.value)
               }}
        ></input>

        <div className="questions-wrap">
            <div>
                <div className={'questionTitle'}>Выбранный вопрос:</div>
                <QuestionOne urlPrefix={urlPrefix} question={selectedQuestion} ind={-1} selectedQuestionId={selectedQuestionId}></QuestionOne>
            </div>
            <hr/>
            <div className={'questionTitle'}>Выберите вопрос</div>
        </div>
        <div className="questions-wrap">


            {(tagQuestions || []).map((it, ind) => {
                return <QuestionOne urlPrefix={urlPrefix} question={it} ind={ind} onChange={onChange}
                                    selectedQuestionId={selectedQuestionId}></QuestionOne>
            })}
            {!!otherQuestions && !!otherQuestions.length && <><hr/>
            <div className={'questionTitle'}>Вопросы с другими тегами</div>
            <hr/>
            {(otherQuestions || []).map((it, ind) => {
                return <QuestionOne urlPrefix={urlPrefix} question={it} ind={ind} onChange={onChange}
                                    selectedQuestionId={selectedQuestionId}></QuestionOne>
            })}</>}
        </div>

    </>
}



function QuestionOne({question, urlPrefix, onChange, ind, selectedQuestionId}) {

    return (question && question._id ? <div key={ind} onClick={() => {
        onChange && onChange(question._id, question)
    }} className={"questionInList " + (selectedQuestionId == question._id ? 'activeQuestion' : '')}>
        {/*<small onClick={(e) => {*/}
        {/*    Storage.tryRemoveQuestion(it, () => {*/}
        {/*        // setForceLoad(new Date().getTime())*/}
        {/*    })*/}
        {/*    return e.stopPropagation();*/}
        {/*}} className={'close-icon'}>*/}
        {/*    <span className="fa fa-times"></span>*/}
        {/*</small>*/}
        {urlPrefix && <a style={{float: 'left'}} href={urlPrefix + question._id} onClick={(e) => {
            return e.stopPropagation();
        }}>
            <span className="close-icon fa fa-pencil"></span>
        </a>}
        {Storage.pubName(question.title || question.name || '-----')}
    </div> : null)
}


export default Questions;