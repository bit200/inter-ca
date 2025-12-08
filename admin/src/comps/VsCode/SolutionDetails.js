import React, {useState} from 'react';
import Button from "../../libs/Button";
import PreviewAnswer from "./PreviewAnswer";
import {AnswerAndFacts} from "../Suggest/PreviewCourseModule";

function SolutionDetails(props) {
    //console.log('*........ ## ROOT RENDER', props);

    let [openAnswer, setOpenAnswer] = useState(false)

    // let v = useActionData();
    return <div>
        Solution Details
        <hr/>
        {<>
            <Button
                size={'sm'} color={4} onClick={(scb) => {
                scb && scb()
                setOpenAnswer(!openAnswer)
            }}>
                {t(openAnswer ? 'hideSolution' : 'showSolution')}
            </Button>
        </>}

        <Button size={'sm'} onClick={(scb) => {
            console.log("qqqqq open correct",);
            // window?.onConfirm && window?.onConfirm({
            //     yes: t('yesLogout'),
            //     name: t('areYouSure')
            // }, () => {
            //
            // })
            props.open_correct_code && props.open_correct_code(scb);

        }}>Open Correct</Button>
        {openAnswer && <>
            <hr/>
            <AnswerAndFacts item={props?.selected_block}></AnswerAndFacts></>}
    </div>
}

export default SolutionDetails
