import React, {useEffect, useState} from 'react';
import {getQuizAnyName} from "../RunExam";
import Skeleton from "../../libs/Skeleton";
export const getRateCN = (rate) => {
    if (!rate) {
        return 'audio-grey'
    }
    if (rate < 3) {
        return 'audio-red'
    }
    if (rate == '5') {
        return 'audio-green'
    }
    return 'audio-yellow'
}

function Layout2(props) {
    let [info, setInfo] = useState({});
    let [loading, setLoading] = useState(true)

   //console.log('*........ ## Auto Interview ', props);

    let {interview = {}, onClick} = props || {};

    useEffect(() => {
        loadInterviewDetails();
    }, [interview?._id])

    let loadInterviewDetails = () => {
        setLoading(true)
        interview._id && global.http.get('/load-interview-details', {_id: interview._id}).then(r => {
            setLoading(false)
            let obj = r.reduce((acc, it) => {
                return {...acc, [it.quiz]: it}
            }, {})
           console.log("qqqqq set infofofofofo", obj, r);
            setInfo(obj)
        })
    }
    let onSetInfo = (_id, obj) => {
        let stat = info[_id] || {}

        setInfo({...info, [_id]: {...info[_id] || {}, ...obj || {}}})
        global.http.get('/set-quiz-answer-details', {_id: stat._id, answerDetails: obj.answerDetails || {}})

    }
    // let v = useActionData();
    if (loading) {
        return <Skeleton count={5}></Skeleton>
    }

    return <div>
        {(interview.quizes || []).map((it, ind) => {
            let stat = (info || {})[it] || {}
           //console.log("qqqqq statstat",stat );
            let answerDetails = stat.answerDetails || {}
            if (!stat || !stat._id) {
                return <div>-</div>
            }
            return (<div key={ind} className={'row'}>
                <div className="col-sm-12">
                    <hr/>
                </div>
                <div className="col-sm-8">
                    <a
                        style={{marginRight: '5px'}}
                        onClick={() => {
                            myPlayer({path: `/${stat.user}/${stat.hash}.wav`})
                        }}><span className="fa fa-play-circle"></span></a>
                    {getTitleInfoName(stat)}
                    {/*{getQuizAnyName(stat)}*/}

                    <div className={'recognized-text'}  onClick={() => {
                        myPlayer({path: `/${stat.user}/${stat.hash}.wav`})
                    }}>
                        {answerDetails.recognizedText || '-'}
                    </div><QHScore item={stat} rate={stat?.answerDetails?.rate} onChange={(rate) => {
                    onSetInfo(it, {answerDetails: {...stat?.answerDetails || {}, rate}})
                }}></QHScore>
                </div>

                <div className="col-sm-4">
                    <Button size={'sm'} onClick={(cb) => {
                        cb && cb();
                        onClick && onClick(stat.question)
                    }}>
                        <i className="iconoir-spark"></i>
                        {t('startTrain')}</Button>
                    <div className={getRateCN(stat?.answerDetails?.rate)}>
                        {t('rate55')}: {stat?.answerDetails?.rate}
                    </div>
                    <div className={getRateCN(stat?.adminDetails?.rate)}>
                        {t('rateAdmin')}:  {stat?.adminDetails?.rate}
                    </div>
                    {/*<div className={getRateCN(stat?.reviewDetails?.rate)}>*/}
                    {/*Ревью оценка: {stat?.reviewDetails?.rate}*/}
                    {/*</div>*/}

                </div>

            </div>)
        })}


    </div>
}

export function getTitleInfoName(stat) {
    let titleInfo = stat?.titleInfo || {}
    return titleInfo.title || titleInfo.smallTitle || titleInfo.desc || stat.name || '--'
}

export const QHScore = (props) => {

    let [rate, setRate] = useState(props.rate || 0)
    useEffect(() => {
        setRate(props.rate)
    }, [props.rate, props?.item?._id])

    let {onChange} = props;

    return <>
        <div>
            {([1, 2, 3, 4, 5] || []).map((it, ind) => {
                return <>
                    <button key={ind}
                            onClick={() => {
                                setRate(it)
                                onChange && onChange(it)
                            }}
                            className={'btn btn-sm ' + (rate == it ? 'btn-primary btn-active active selected' : 'btn-light')}
                    >{it}</button>
                </>
                // return (
                //     <span key={ind} className={'shortTag ' + (rate == it ? 'selected' : '')}
                //           onClick={() => {
                //               setRate(it)
                //               onChange && onChange(it)
                //           }}>
                //         {it}
                //     </span>)
            })}
        </div>
    </>
}

export default Layout2

