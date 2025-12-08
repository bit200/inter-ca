import React, {useEffect, useState} from "react";
import Storage from "../Suggest/CustomStorage";
import TagSelector from "../Suggest/TagSelector";
import Questions from "../Suggest/QuestionsSelection";

function InterviewTagsSel(props) {
    let {item, onGlobalChange} = props.props;
    let [forceLoad, setForceLoad] = useState([])

   //console.log("qqqqq item", props.props);


    return <div>
        <TagSelector
            props={{
                localItem: item,
                onChange: (value, key) => {
                    item[key] = value;
                    onGlobalChange(item)
                }
            }}

        ></TagSelector>

        <div style={{marginTop: '20px'}}>
            Ссылка на интервью <a href={'/interviews/' + item.interview} > #{item.interview}</a>
        </div>
        <hr/>

        Выбор относящегося вопроса

        <Questions
            themeQuestionId={item.themeQuestionId}
            forceLoad={forceLoad}
            setForceLoad={() => {
                setForceLoad(new Date().getTime())
            }}
            hashTags={item.hashTags}
            onChange={(themeQuestionId) => {
                item.themeQuestionId = themeQuestionId;
                onGlobalChange(item)
                if (!themeQuestionId) {
                    Storage.createThemeQuestion({
                        hashTags: item.hashTags,
                        name: item.name
                    }, (question) => {
                        item.themeQuestionId = question._id;
                        onGlobalChange(item)
                        setForceLoad(new Date().getTime())
                    })
                } else {

                }

            }
            }></Questions>

    </div>
}

export default InterviewTagsSel;