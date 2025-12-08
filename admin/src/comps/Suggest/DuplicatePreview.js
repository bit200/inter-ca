import React, {useState} from 'react';
import _ from 'underscore';

import {
    Link, Outlet
} from "react-router-dom";
import QuestionDetails from "./QuestionDetails";
import {editQuestion} from "./SuggestionItem";
import Smart from "libs/Smart";


function DuplicatePreview(props) {
   //console.log('*........Dupl Preview', props);
    let [migrateQuestion, setMigrateQuestion] = useState(null)
    let [previewInd, setPreviewInd] = useState(1)
    let {question1, question2, onClose} = props;

    migrateQuestion = migrateQuestion || question1 || {};
    question1 = question1 || {};
    question2 = question2 || {};
    // let v = useActionData();
    return <div>
        <div className="row">
            <div className="col-sm-4">
                <a onClick={() => {
                    setPreviewInd(1)
                }}>Question #{question1._id}</a>
                <a style={{marginLeft:'10px'}} onClick={() => {
                    setPreviewInd(2)
                }}>Question #{question2._id}</a>
                <QuestionDetails woSuggestions={true} withoutShow={true} showName={true}
                                 question={previewInd === 1 ? question1 : question2}></QuestionDetails>
            </div>
            {/*<div className="col-sm-3">*/}
            {/*    <QuestionDetails woSuggestions={true} withoutShow={true} showName={true} question={question2}></QuestionDetails>*/}
            {/*</div>*/}
            <div className="col-sm-8">
                <button className={'btb btn-xs btn-primary pull-left2'} onClick={() => {
                    global.http.post('/combine-two-questions', {migrateQuestion, _ids: [question1._id, question2._id]})
                        .then(r => {
                           //console.log("qqqqq questions Are migrated", r);
                            onClose && onClose()
                            // loadAndSet();
                        })
                }}>Объединить вопросы
                </button>
                <hr/>
                <div></div>

                {([question1._id, question2._id]).map((it, ind) => {
                    return (<button onClick={() => {
                        setMigrateQuestion({...migrateQuestion, _id: it})
                    }} key={ind}
                                    className={'btn btn-xs btn-default ' + (it == migrateQuestion._id ? 'btn-selected active' : '')}>
                        {it}
                    </button>)
                })} : Какой вопрос сохранить как оригинал?

                <hr/>


                <Smart
                    obj={{...migrateQuestion, originalDuplicateId: null}}
                    items={editQuestion}
                    onChange={(v) => {
                        setMigrateQuestion({...v});
                       //console.log("qqqqq vvv", v);
                    }
                    }
                ></Smart>
            </div>
        </div>
    </div>
}

export default DuplicatePreview
