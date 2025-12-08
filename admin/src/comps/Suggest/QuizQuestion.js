import Button from "../../libs/Button";
import React, { useState } from "react";
import IsFavorite from "../IsFavorite";
import MDEditor from "@uiw/react-md-editor";

let changeStatus = Storage.changeStatus;
let sortQuestions = Storage.sortQuestions;

function QuizQuestion(props) {
  let { question, defClass } = props;

  if (!question) {
    return "Lodaing ...";
  }

  let categories = Storage.getCategories();
  global.historyObj = global.historyObj || {};

  let histObj =
    props.historyObj || (global.historyObj || {})[question._id] || {};

  return (
    <div className={defClass || ""} style={{ paddingTop: "15px" }}>
      {!props.woAction && (
        <div className="default-button-wrapper">
          {(global.question_statuses || []).map((it, ind) => {
            let quest_status = histObj.status || "";

            let isActive = quest_status === it.status;
            return (
              <button
                color={isActive ? 1 : 1}
                className={
                  "default-button btn btn-xs btn-default " +
                  (isActive ? "active" : "")
                }
                selected={isActive}
                key={ind}
                // size={'xs'}
                onClick={(scb) => {
                  question.status = it.status;
                  props.onChange && props.onChange(question);
                  // scb && scb()
                  changeStatus(question);
                }}
              >
                {it.name}
              </button>
            );
          })}
          <div
            style={{
              display: "inline-block",
              marginRight: "20px",
              marginLeft: "10px",
            }}
          >
            <IsFavorite
              size={25}
              question={question}
              item={histObj}
            ></IsFavorite>
          </div>
        </div>
      )}

      {!props.woName && (
        <>
          <hr />
          {/*<div className={'hash-tags'}>*/}
          {/*    {(question.hashTags || []).map((it, ind) => {*/}
          {/*        return (<small key={ind}>*/}
          {/*            {categories[it].title}*/}
          {/*        </small>)*/}
          {/*    })}*/}

          {/*</div>*/}

          <div className={"quiz-title"} data-color-mode="light">
            <MDEditor.Markdown source={question.name} />
          </div>
        </>
      )}
    </div>
  );
}

export default QuizQuestion;
