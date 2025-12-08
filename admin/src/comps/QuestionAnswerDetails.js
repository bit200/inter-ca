import Button from "../libs/Button";
import MyModal from "../libs/MyModal";
import React, {useEffect, useState} from "react";
import QuestionDetails from "./Suggest/QuestionDetails";
import QuestionEditor from "./QuestionEditor";
import MDEditor from '@uiw/react-md-editor';

function QuestionAnswerDetails (props) {
    let {question} = props;
    let modal;
    useEffect(() => {
        // modal.show();
        // setTimeout(() => {
        //     setQuestion(props.question)
        // })
    }, [props.question])

   //console.log("qqqqq question", question);
    return !question ? null : <div>

        <Button className={"nextQ pull-right"} size={'xs'} color={1} onClick={(cb) => {
            cb && cb();
            modal.show();
        }}>
            <div className="fa fa-edit"></div>
        </Button>
        <div className="answer-sep"></div>
        {/*<div>*/}
        {/*    <MDEditor.Markdown source={(question || {}).answer} style={{ whiteSpace: 'pre-wrap' }} />*/}
        {/*</div>*/}
        {/*<div></div>*/}
        {/*<hr/>*/}
        <QuestionDetails question={question}></QuestionDetails>

        <MyModal
            size={'full'}
            ref={(el) => modal = el}
        >
            <QuestionEditor onChange={(v) => {
                modal.hide();
                props.onChange && props.onChange(v);
               //console.log("qqqqq vvvvvvvvvvvvvvvvvvv", v);
                // setQuestion(v);
            }} question={question}
            ></QuestionEditor>
        </MyModal>


    </div>
}

export default QuestionAnswerDetails;

