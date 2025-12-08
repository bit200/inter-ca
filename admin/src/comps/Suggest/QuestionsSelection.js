import React, {useEffect, useState} from "react";
import Storage from "./CustomStorage";
import QuestionsListWithSelect from './QuestionsListWithSelect';

let isAdmin = global.env.isAdmin;
function Questions({themeQuestionId, forceLoad, setForceLoad, onSave, hashTags, onChange}) {
    let [allQuestions, setAllQuestions] = useState([])

    useEffect(() => {
        Storage.loadAllQuestions(r => {
           //console.log("qqqqq load ALL QUWTRIONS", r);
            setAllQuestions(r)
        })
    }, [forceLoad])

    function setNewQuestion() {
        if (!hashTags || !hashTags.length) {
            return alert('Заполните в начале хэштег')
        }
        onChange(0)
    }


    return <div>
        <button className={'btn btn-xs btn-default'} style={{marginBottom: '10px'}} onClick={setNewQuestion}>Это новый вопрос</button>

        <QuestionsListWithSelect
            urlPrefix={isAdmin ? '/theme-question' : ''}
            hashTags={hashTags}
            selectedQuestionId={themeQuestionId}
            questions={allQuestions}
            onChange={(_id) => {
                onChange && onChange(_id, allQuestions.filter(it => it._id == _id)[0])
            }
            }></QuestionsListWithSelect>
    </div>
}

export default Questions;