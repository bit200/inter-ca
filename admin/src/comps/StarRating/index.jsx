import React, {useState, useEffect} from "react";
import "./style.css";
import Smart from "../../libs/Smart";
import MyModal from "../../libs/MyModal";
import {generateSuggestion} from "../Suggest/SuggestionItem";


export const StarRating = (props) => {
    const [hover, setHover] = useState(0);
    const [history, setHistory] = useState({});
    const [avg, setAvg] = useState({});
    const [open, setOpen] = useState(false);
    const [DPOPen, setDPOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    let {question} = props || {};
    let questionId = (question || {})._id;
    useEffect(() => {
        question && question._id && global.http.get('/get-rating', {questionId}).then((r) => {
            setHistory({question: questionId, ...r || {}})
            setLoading(false)
            setAvg(question.rating || {})
        })
    }, [(question || {})._id])

    let ratingValue = (history.rating || {}).score;

    function setHistoryDB(_history) {
        setHistory({..._history})
        global.http.post("/set-rating", _history).then(r => {
            let {avg} = r;
            setAvg(avg)
            question.rating = avg;
            //console.log("update AVG values", r)
        })
    }

    function getVotesLabel(votes) {
        let label = 'голос';

        if (votes === 0 || votes >= 5 && votes <= 20) {
            label = 'голосов';
        } else if (votes % 10 === 1) {
            label = 'голос';
        } else if (votes % 10 >= 2 && votes % 10 <= 4) {
            label = 'голоса';
        } else {
            label = 'голосов';
        }

        return `(${votes} ${label})`;
    }

    if (loading) {
        return <></>
    }

    return (
        <div className="star-rating ">
            {/* {[...Array(5)].map((_, i) => (
                <div
                    key={`star-rating-btn_${i + 1}`}
                    className={'ib ' + (i + 1 <= (hover || ratingValue) ? "on" : "off")}
                    onClick={() => {
                        setHistoryDB({...history || {}, rating: {score: i + 1, cd: new Date().getTime()}});
                    }}
                    onMouseEnter={() => setHover(i + 1)}
                    onMouseLeave={() => setHover(ratingValue)}
                >
                    <span className="star">&#9733;</span>
                </div>
            ))} */}
            <div className="ratingList">
                <div
                    title={t('like')}
                    className={"btn btn-light btn-sm " + (ratingValue > 3 ? 'active' : '')}
                    onClick={() => {
                        setHistoryDB({
                            ...history || {},
                            rating: {...(history || {}).rating || {}, score: 5, cd: new Date().getTime()}
                        });
                    }}>
                    <i className="iconoir-thumbs-up"></i>
                </div>
                <div
                    title={t('dislike')}
                    className={"btn btn-light btn-sm " + (ratingValue <= 3 && ratingValue > 0 ? 'active' : '')}
                    onClick={() => {
                        setHistoryDB({
                            ...history || {},
                            rating: {...(history || {}).rating || {}, score: 1, cd: new Date().getTime()}
                        });
                    }}>
                    {/*<div className={"btn btn-light btn-sm " + (ratingValue > 3 ? 'liked' : '')}*/}
                    <i className="iconoir-thumbs-down"></i>
                </div>

                {/* {!ratingValue && <small>Оцените топик</small>} */}
                <div className="rel ib">

                    <div className="btn btn-light btn-sm"><>
                        {/* Средняя {(avg.avgScore || 0).toFixed(1)} {getVotesLabel(avg.count)} */}
                        {/* <div></div> */}
                        <a onClick={() => {
                            setOpen(true)
                        }}>
                            <i className="iconoir-git-fork"></i>
                            {t('whatImprove')}
                            {/*<i className="iconoir-nav-arrow-down"></i>*/}
                        </a>

                        <MyModal
                            isOpen={open}
                            onClose={() => setOpen(false)}
                        >
                            <div style={{'marginTop': '10px'}}>
                                <div>{t('thanksFeedback')}</div>
                                <hr/>

                                <small style={{marginBottom: '10px', display: 'inline-block'}}>
                                    {t('selectWhatImprove')}
                                </small>
                                <Smart
                                    obj={history.rating}
                                    items={[{
                                        size: 12,
                                        type: 'select',
                                        key: 'type',
                                        items: [
                                            {name: 'selectVariant', value: ''}, {
                                                name: 'unclear_question',
                                                value: 'unclear_question'
                                            },
                                            {
                                                value: 'not_deep_answer',
                                                name: 'not_deep_answer'
                                            }, {value: 'not_actual_question', name: 'not_actual_question'}]
                                    },
                                        {
                                            size: 12,
                                            defClass: 'mt10',
                                            childs: [{
                                                name: t('desc') + t('(optional)'),
                                                minRows: 1,
                                                key: 'desc',
                                                size: 12,
                                                type: 'textarea'
                                            }]
                                        }]}
                                    onChange={(rating) => {
                                        rating.cd = new Date().getTime();
                                        setHistory({...history, rating})
                                    }}
                                >

                                </Smart>
                                <div
                                    style={{marginTop: '10px'}}
                                ></div>
                                <a className={'pull-right'} >
                                    <div className="c1">
                                        <>
                                            <a onClick={() => {
                                                generateSuggestion(questionId)
                                            }}>
                                                {/*<i className="iconoir-git-fork"></i>*/}
                                                {t('suggestCustomVariant')}
                                                <i className="iconoir-open-new-window pull-right" style={{marginTop: '4px', marginLeft: '3spx'}}></i>
                                            </a>
                                        </>

                                    </div>
                                </a>
                                {/*<hr/>*/}
                                <button className={'btn btn-sm btn-primary'}
                                        onClick={() => {
                                            setOpen(false)
                                            setHistoryDB(history)
                                        }}
                                >
                                <Check></Check>
                                    {t('send')}
                                </button>
                            </div>

                        </MyModal>

                    </>
                    </div>
                    {/*{DPOPen && <div className="dropdown-menu show"*/}
                    {/*     style={{*/}
                    {/*         "position": "absolute",*/}
                    {/*         inset: "0px auto auto 0px",*/}
                    {/*         margin: "0px",*/}
                    {/*         transform: "translate(0px, 30px)"*/}
                    {/*     }}*/}
                    {/*     data-popper-placement="bottom-start">*/}
                    {/*    <a className="dropdown-item" onClick={() => {*/}
                    {/*        setOpen(true)*/}
                    {/*        setDPOpen(false)*/}
                    {/*    }}>Подсветить проблему</a>*/}
                    {/*    <a className="dropdown-item" onClick={() => {*/}
                    {/*        generateSuggestion(questionId)*/}
                    {/*    }}>Предложить свой ответ</a>*/}
                    {/*</div>}*/}
                </div>
                {/*<div className="btn btn-light btn-sm">*/}
                {/*    <>*/}
                {/*        <a onClick={() => {*/}
                {/*            generateSuggestion(questionId)*/}
                {/*        }}>*/}
                {/*            <i className="iconoir-git-fork"></i>*/}
                {/*            Предложить свой ответ*/}
                {/*        </a>*/}
                {/*    </>*/}

                {/*</div>*/}
            </div>

        </div>
    );
};


export default function Check() {
    return <i className="iconoir-double-check"></i>
}
