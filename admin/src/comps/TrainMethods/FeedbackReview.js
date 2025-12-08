import React, {useEffect, useState} from 'react';

function Layout2(props) {
    let [info, setInfo] = useState({});

   //console.log('*........ ## Auto Interview ', props);

    let {fb = {}} = props || {};

    useEffect(() => {
        loadInterviewDetails();
    }, [fb?._id])

    let loadInterviewDetails = () => {
        fb._id && global.http.get('/quiz-history/' + fb.hist1, {_id: fb.hist1}).then(r => {
            setInfo(r)
        })
    }
    let onSetInfo = (_id, obj) => {
        // let stat = info[_id] || {}
        //
        // setInfo({...info, [_id]: {...info[_id] || {}, ...obj || {}}})
        // global.http.get('/set-quiz-answer-details', {_id: stat._id, answerDetails: obj.answerDetails || {}})
       //console.log("qqqqq on SET INFO", _id);
    }
    // let v = useActionData();
    let {answerDetails = {}, adminDetails = {}, reviewDetails = {}, stats = {}} = fb;
   //console.log("qqqqq feedback detailssssss", answerDetails, adminDetails, 'ffff', fb);

    return <div>
        <div></div>
        {info.name}
        <div></div>

        <hr/>
        <div></div>
        Изначальная оценка: {answerDetails.rate}
        <div></div>
        Админ оценка: {adminDetails.rate}
        <div></div>
        Ревью оценка: {reviewDetails.rate}
        <hr/>
        <Button size={'xs'} onClick={(cb) => {
            cb && cb();
            props.onTrain && props.onTrain({fb, hist: info});
        }}>Тренировать</Button>

        <div></div>

        <HashPlayer item={info}>
            {info.recognition?.recognizedText || ''}
        </HashPlayer>
        <div>
            <hr/>
        </div>
        <div></div>

    </div>
}

export const HashPlayer = (props) => {
    let {hash, user} = props.item || {};
    return <div onClick={() => {
        myPlayer({path: `/${user}/${hash}.wav`})
    }}>
        <div className="fa fa-play-circle"></div>
        <div></div>
        {props.children}
    </div>
}
export default Layout2

