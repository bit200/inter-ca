import React, {useState} from 'react';
import RenderQuizResults from "./Suggest/RenderQuizResults";
import MDEditor from "@uiw/react-md-editor";
import LogsStarterPreview from "./Suggest/LogsStarterPreview";
import LazyEditor from "./LazyEditor/LazyEditor";
import MyImg from "./MyImg";
import AudioPlayer from "react-h5-audio-player";
import Button from "../libs/Button";

function ExamResultsAudio(props) {
    let {quiz, hist, onRate} = props || {}
    quiz ??= {};
    hist ??= {}


    console.log("qqqqq quzzzzzzzz Audio", quiz, hist, hist.userRate);
    return <div>
        {quiz.audioName}
        <hr/>

        <a onClick={() => {
            myPlayer({src: hist.publicUrl})
        }}>{t('play_audio')}</a>
        <hr/>
        {t('user_rate')}: {hist?.userRate}
        <div></div>
        {([1,2,3,4,5] || []).map((it, ind) => {
            return (<Button color={hist?.userRate == it ? 0 : 4} size={'sm'} key={ind} onClick={(scb) => {
                scb && scb()
                onRate(quiz?._id, it)}}>
                {it}
            </Button>)
        })}
        
        
    </div>
}

function isAudioOK (it, correct_index) {

    return ((it._id + +correct_index) * 17) == it.parent_session_id
}


export {ExamResultsAudio, isAudioOK}
