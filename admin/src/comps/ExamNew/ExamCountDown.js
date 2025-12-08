import MyImg from "../MyImg";
import React, {useEffect, useState} from "react";

export function ExamCountDown(props) {
    let [cd, setCd] = useState(new Date().getTime())
    let [isShown, setIsShown] = useState(false);
    // let {end} = props;
    let {exam} = props;
    let end = getEndDate(exam)

    let delta = Math.max(0, Math.round((end - cd) / 1000));
    let minutes = Math.round(delta / 60);
    let hours = Math.floor(minutes / 60);
    let seconds = Math.round(delta % 60)
    minutes = minutes % 60;

    let {warning, onWarning} = props;

    function pub(v) {
        return v < 10 ? '0' + v : v;
    }

    let mins = pub(minutes);
    let hs = pub(hours);

    useEffect(() => {
        if (!delta) {
            props.onEnd && props.onEnd()
        }
    }, [delta])
    useEffect(() => {
        let str = hs + ':' + mins;
        if (!isShown && str === warning) {
            setIsShown(true)
            onWarning && onWarning(str)
        }
    }, [cd])
    useEffect(() => {
        const timer = setInterval(() => {
            setCd(new Date().getTime());
        }, 1000);

        return () => {
            clearInterval(timer);
        };
    }, []);


    return <div className={'ib countdown'} style={{marginRight: '5px'}}>{hs} <span
        className={'countdots'}>:</span> {mins}</div>
}


function getEndDate(exam) {
    let startCd = exam.startCd;
    let minutes = getMinutes(exam);
    return new Date(startCd).getTime() + minutes * 1000 * 60;
}

function getMinutes(exam) {
    let arr = (exam.minutesStr || '').split('\n')
    //console.log("qqqqq getMinutesgetMinutesgetMinutes", arr, exam, exam.attemptInd < 1);
    if (!exam.attemptInd) {
        return parseFloat(arr[0]) || 60
    } else {
        return arr[exam.attemptInd]
    }
}

