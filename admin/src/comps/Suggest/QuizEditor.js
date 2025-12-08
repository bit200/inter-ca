import React, {useState, useEffect} from 'react';
import _ from 'underscore';
import Smart from 'libs/Smart';
import {
    Link, Outlet
} from "react-router-dom";
import CustomStorage from './CustomStorage';
import {QuizEditFields} from './SuggestionItem'
import QuizPreview from './QuizPreview'
import Button from 'libs/Button';

function QuizEditor(props) {
    let [open, setOpen] = useState(false)
    let [items, setItems] = useState([])
    let [cd, setCd] = useState(0)

    let {item = {}, customData = {}} = props;
    let {keyId} = customData || {};
    let isCustom = Boolean(customData.onChangeQuizes);
    let questionId = props.questionId || (item || {}).questionId || (item || {})._id || CustomStorage.getId()

    useEffect(() => {
        !isCustom && questionId && global.http.get('/load-quizes-by-question', {question: questionId})
            .then(items => {
                onSetItems(items)
                //  //console.log('setCount', props)
                //   props.setCount && props.setCount(items.length)
            })
    }, [questionId])

    function onChangeQuizItem(quiz, ind) {
        items[ind] = {...quiz};
        setItems([...items])
        customData.onChangeQuizes && customData.onChangeQuizes([...items]);
        // console.log("qqqqq on chagne", [...items], items, quiz);
        !isCustom && global.http.put('/quiz', {item: quiz})
            .then(item => {
                let isUpdated = false;
                _.each(items, (it, ind) => {
                    if ((it._id == quiz._id) && (it.isValid != item.isValid)) {
                       //console.log("qqqqq tttttttt44444", it.isValid, item.isValid );
                        isUpdated = it
                        items[ind] = item
                    }

                })
               //console.log("qqqqq item is Updated",isUpdated, quiz.isValid, item);

                if (isUpdated) {
                    customData.onChangeQuizes && customData.onChangeQuizes([...items]);
                    setItems(items)
                }

            })
    }

    useEffect(() => {
        props.onChangeItems && props.onChangeItems(items)
    }, [items])

    useEffect(() => {
        customData && onSetItems(customData.quizes || [])
    }, [keyId])


    function onAddQuiz(type, scb, ecb) {
        global.http.post('/quiz', {question: questionId})
            .then(r => {
                items[type || 'push'](r)
                onSetItems([...items]);

                scb && scb()
            })
            .catch(ecb)
    }

    function onSetItems(items) {
        setItems(items)
        props.setCount && props.setCount(items.length)

    }

   //console.log("asdfasdfasdfasfd")
    return <>

        <div>
            <Link to={'/theme-question/' + questionId}>Question #{questionId}</Link>

            <hr/>
        </div>
        <Button onClick={(scb, ecb) => onAddQuiz('unshift', scb, ecb)}>Добавить квиз</Button>

        {(items || []).map((it, ind) => {
            return (<div key={ind} >
                <div className="row">
                    <div className="col-sm-12">
                        <hr/>
                    </div>
                    <div className="col-sm-6">
                        <div className="pull-right">
                            <button
                                onClick={() => {
                                    global.http.delete('/quiz', {_id: it._id})
                                        .then(r => {
                                            onSetItems([..._.filter(items, item => item._id != it._id)])
                                        })
                                }}
                                className={'btn btn-xs btn-default'}>
                                Удалить квиз
                            </button>
                        </div>
                        <strong style={{marginBottom: '10px', display: 'block'}}>{!it.isValid ? <label className={'label label-xs label-danger'}>Не доступен к показу</label> : <label className={'label label-xs label-success'}>На сайте</label>} Quiz #{ind + 1} </strong>
                        <div></div>


                        <Smart
                            memo={'quiz_' + it._id}
                            items={QuizEditFields}
                            obj={it}
                            onChange={(v) => {
                               //console.log('vvvvvv', v)
                                onChangeQuizItem({
                                    ...v, variations: v.variations.map(it => {
                                        return {...it}
                                    })
                                }, ind)
                                setTimeout(() => {
                                    setCd(new Date())
                                })
                            }}
                        ></Smart>
                    </div>
                    <div className="col-sm-6">
                        <QuizPreview
                            quiz={{...it, variations: it.variations}}//_.shuffle(it.variations)}}
                            onSubmit={() => {
                               //console.log("qqqqq on Submit",);
                            }}></QuizPreview>
                    </div>

                </div>

            </div>)
        })}
        <hr/>
        <Button onClick={(scb, ecb) => onAddQuiz('push', scb, ecb)}>Добавить квиз</Button>


    </>
}

export default QuizEditor
