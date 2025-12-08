import MyImg from "../MyImg";
import React from "react";
import Button from "../../libs/Button";
import {getExamId} from "./GetExamId";

export function ExamStartScreen (props) {
    return <>
        <div style={{marginTop: '20px', paddingBottom: '20px'}}>
            <MyImg width={300}>exam</MyImg>
        </div>
        <Button
            size={'sm'}
            onClick={(scb, ecb) => {
                global.http.get('/user-start-exam-new', {_id: getExamId()})
                    .then(exam => {
                        props.onStarted && props.onStarted(exam)
                        scb && scb()
                        // loadExam();
                    })
                    .catch(ecb)
            }}>
            <i className="iconoir-code"></i>
            {t('startExan')}
        </Button>
    </>
}

