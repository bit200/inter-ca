import React, { useEffect, useRef, useState } from "react";
import _ from "underscore";

import { Link, Outlet } from "react-router-dom";
import QuizPreview from "./QuizPreview";
import MyModal from "../../libs/MyModal";
import RunQuiz from "./RunQuiz";

function Layout2(props) {
  let [data, setData] = useState({});
  let [quizItems, setQuizItems] = useState([]);
  let [loading, setLoading] = useState(false);
 //console.log("*........ ## ROOT RENDER", props);
  let modal = useRef(null);
  useEffect(() => {}, []);

  function startQuiz() {
    setLoading(true);
    modal.current.show();
    global.http.get("/get-my-quiz").then((r) => {
     //console.log("qqqqq rrrrr", r);
      setLoading(false);
      setQuizItems(r);
    });
  }

  return (
    <div>
      <button
        className={
          "btn btn-xs btn-default default-button default-button-single"
        }
        onClick={() => {
          startQuiz();
        }}
      >
        Тренировка вопросов
      </button>
      <MyModal ref={modal}>
        <div style={{ width: "100%" }}></div>
        <div className={loading ? " tc pt40 o5" : ""}>
          {loading && <div>{t('loading')} ...</div>}
          {!loading && !quizItems.length && (
            <div className={"tc w100"} style={{ padding: "50px 20px" }}>
              Нет активных квизов для тренировки
            </div>
          )}
          {!!quizItems.length && <RunQuiz items={quizItems}></RunQuiz>}
        </div>
      </MyModal>
    </div>
  );
}

export default Layout2;
