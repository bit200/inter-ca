import React, {useEffect, useState} from 'react';
import _ from 'underscore';

import {
    Link, Outlet
} from "react-router-dom";
import Button from "../../libs/Button";

function getTrainHist() {
    return Storage.get('TrainHashHistory') || [];
}

function getTrainHist0() {
    return getTrainHist()[0]
}

window.getTrainHist = getTrainHist;
let localTrainStatus = 0;
let localTrainHash = new Date().getTime() + Math.random(1) / 100
// console.log("qqqqq localTrainHash", localTrainHash);

function unshiftHistory(status) {
    let cd = new Date().getTime();
    let history = getTrainHist();
    history.unshift({hash: localTrainHash, status, cd});
    localTrainStatus = status

    Storage.set('TrainHashHistory', history.slice(0, 10));
}

function getLastTrain () {
    return getTrainHist().find(it => it.status == 1)
}


window.addEventListener("beforeunload", function (e) {
    let lastTrain = getLastTrain();

   //console.log("qqqqq lastTrain", lastTrain);
    if (!lastTrain || lastTrain.hash != localTrainHash) {
        return;
    }
    stopTrain();
});

window.startTrain = () => {
    unshiftHistory(1)
}
window.stopTrain = () => {
    unshiftHistory(0)
}
window.forceActivateTab = () => {
    unshiftHistory(-1)
    _checKTrain();
}

// getTrainHist()
function DisableScreenWhenTrain2(props) {
    let children = props.children;
    return children
}
export function isErr() {
    let history = getTrainHist();
    let hist0 = history[0] || {};
    let firstHist_1 = history.find(it => it.status == -1) || {}
    let firstHist0 = history.find(it => it.status == 0) || {}
    let firstHist1 = history.find(it => it.status == 1) || {}

    let cd_1 = (firstHist_1 || {}).cd
    let cd1 = (firstHist1 || {}).cd
    let cd0 = (firstHist0 || {}).cd

    let isTrain = cd1 > cd0;
    let isError = isTrain && (firstHist1.hash != localTrainHash)

    if (((new Date().getTime() - cd_1) < 5000 ) && firstHist1.hash == localTrainHash) {
        stopTrain();
        window.location.href = '/'
    }
    // //console.loglog("qqqqq {{ hist0", hist0, localTrainHash);
    return {err: (hist0.status == 1) && isTrain && isError, hist0}

    // let globalTrainInd = Storage.get('TrainInd');
    // let err = globalTrainInd && localTrainInd != globalTrainInd;
    // return {err, globalTrainInd};
}
function DisableScreenWhenTrain(props) {
    let [isError, setIsError] = useState(false)
    let [cd, setCd] = useState(0)

    useEffect(() => {

        checkTrain()
        let int = setInterval(() => {
            checkTrain()
        }, 1000)
        return () => {
            clearInterval(int)
        }
    }, [])





    function checkTrain() {
        let {err, globalTrainInd} = isErr()
        setIsError(err)
        // if (!err) {
        //     if (document.querySelector('#errorWrapperTrain')) {
        //         setCd(new Date().getTime())
        //     }
        // }
    }

    window._checKTrain = checkTrain;


    let children = props.children;

    return isError ? <div id={'errorWrapperTrain'} className={'mainCont w100'} style={{width: '100%'}}>
        <div style={{fontSize: '24px', textAlign: 'center'}}>На данный момент вы проходите тренировку - сконцентрируйтесь на прохождении - сразу после ее окончания -
            вкладка станет доступна!</div>
        <Button onClick={(cb) => {
            cb && cb();
            forceActivateTab()
        }}>Завершить тренировку и продолжить изучение!</Button>
    </div> : <>{children}</>


    // return {children}
}

export default DisableScreenWhenTrain
