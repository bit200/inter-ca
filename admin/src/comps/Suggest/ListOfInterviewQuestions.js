import React, {useState, useEffect} from 'react';
import _ from 'underscore';

import {
  Link, Outlet
} from "react-router-dom";


function Layout2(props) {
  let {item} = props.props;
  let [questions, setQuestions] = useState([])
 //console.log('*........ ## ROOT RENDER', props);


  useEffect(() => {
    item._id && Storage.loadInterviewQuestionsByTheme(item._id, (r) => {
      setQuestions(r)
    })
  }, [item._id])
  // let v = useActionData();
 //console.log("qqqqq itemitemitemitem", item);
  return <div>
    <small>Уточняющие вопросы:: </small>
    {(item.additionalQuestionsArr || []).map((it, ind) => {
        return (<div key={ind}>
          {it.name}
        </div>)
    })}


    <hr/>
    <div></div>
    <small>Кол-во встречаний в интервью: {item.interviewsCount}</small>
    {(questions || []).map((it, ind) => {
        return (<div><a key={ind} href={'/interview-question/' + it._id} >
          <span className="fa fa-pencil close-icon"></span>{it.name}
        </a>
          {it.interview && <a href={'/interviews/' + it.interview}>  [interview #{it.interview}]</a>}</div>)
    })}


  </div>
}

export default Layout2
