import React, {useState} from 'react';
import RenderQuizResults from "./Suggest/RenderQuizResults";
import MDEditor from "@uiw/react-md-editor";
import LogsStarterPreview from "./Suggest/LogsStarterPreview";
import LazyEditor from "./LazyEditor/LazyEditor";
import MyImg from "./MyImg";

function ExamResultsQuiz(props) {
    let {quiz, hist} = props || {}
    quiz ??= {};
    hist ??= {}
    console.log("qqqqq quzzzzzzzz", quiz, hist);
    return <div>
        {quiz.name}
        <hr/>
        {(quiz.variations || []).map((it, ind) => {
            let isSelected = hist?.data?.selectedInd == ind;
            let isOk = isQuizOk(quiz, ind);
            // {isOk ? 'ok' : 'bad'}
            return (<div key={ind} className={'bcg ' + (isOk ? 'ok' : isSelected ? 'err' : '')}>
                {it.name}
            </div>)
        })}



    </div>
}

function isQuizOk (it, correct_index) {

    return ((it._id + +correct_index) * 17) == it.parent_session_id
}


export {ExamResultsQuiz, isQuizOk}
