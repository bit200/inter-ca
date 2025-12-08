import React, { useEffect, useState } from "react";
import _ from "underscore";
import QuizPreview from "./QuizPreview";
import { Link, Outlet } from "react-router-dom";
import QuestionDetails from "./QuestionDetails";
import { StarRating } from "../StarRating";

export function isCorrectQuizFn(chosen, arr) {
    let res = true;
    _.each(arr, (item, ind) => {
        if (Boolean(item.isCorrect) != Boolean(chosen[ind])) {
            res = false;
        }
    });
    return res;
}
function RunQuiz(props) {
  let { question } = props;
  let [items, setItems] = useState(props.items || []);
  let [history, setHistory] = useState({});
  let [selectedInd, setSelectedInd] = useState(0);
  let isExam = props.isExam || props.examId;
  useEffect(() => {
   //console.log("question is cahnged", question);
    question &&
      global.http
        .get("/load-quizes-by-question", { question })
        .then((items) => {
          setSelectedInd(0);
          setItems(
            isExam
              ? items
              : _.shuffle(
                  items.map((it) => {
                    return { ...it, variations: _.shuffle(it.variations) };
                  })
                )
          );
        });
  }, [question]);

  useEffect(() => {
   //console.log("qqqqq props items is updated", "axxxxxxvvvvvasdf", props);
    props.items && setItems(props.items);
    props.quizHistory && setHistory(props.quizHistory.history);
  }, [(props.items || {}).length]);

  useEffect(() => {
    props.examId &&
      global.http
        .get("/load-quizes-by-exam", { _id: props.examId })
        .then((items) => {
          setItems(items);
        });
  }, [props.examId || -1]);


  function onNext() {
    canNext() &&
      setTimeout(() => {
        setSelectedInd(selectedInd + 1);
      }, 400);
  }

  function canNext() {
    return selectedInd < items.length - 1;
  }

  function getSelectedQuestion() {
    let q = (window.allQuestions || []).filter((it) => {
     //console.log("itttt qqqq555", it);
      return it._id == quiz.question;
    })[0];
   //console.log("qqqq555", q, window.allQuestions, quiz.question);
    return q;
  }

  let quiz = items[selectedInd] || {};
  let quizId = quiz._id;

  props.onChange && props.onChange({ history, quizId });
  history = history || {};
  let questionId = (history[quizId] || {}).question;
 //console.log("aaaaaaa", history, quizId);
  return (
    <div style={{ marginTop: "20px" }} className={isExam ? "examQuiz" : ""}>
      {(items || []).map((it, ind) => {
        let hist = history[it._id] || {};
        let clName = "";
       //console.log("qqqqq hist", hist, history, it._id);
        if (hist.quizStatus === "good") {
          clName = isExam ? "unknown" : "correctDot";
        } else if (hist.quizStatus === "bad") {
          clName = isExam ? "unknown" : "incorrectDot";
        } else if (hist.quizStatus === "unknown") {
          clName = "unknown";
        }

        return (
          <div
            key={ind}
            className={
              " dotsPreview " + clName + (ind === selectedInd ? " active" : "")
            }
            onClick={(e) => {
              setSelectedInd(ind);
            }}
          ></div>
        );
      })}
      <div
        style={{
          width: "100%",
          marginTop: "20px",
          marginBottom: "20px",
          borderBottom: "1px solid #efefef",
        }}
      ></div>

      <QuizPreview
        quiz={quiz}
        isExam={isExam}
        skipBottomOpenText={props.skipBottomOpenText}
        history={history[quizId]}
        onSubmit={(chosen) => {
          let isCorrect = isCorrectQuizFn(chosen, quiz.variations);
          let data = isExam
            ? { chosen, quizStatus: "unknown" }
            : {
                chosen,
                isCorrect,
                isSubmit: true,
                quizStatus: isCorrect ? "good" : "bad",
              };
          history[quizId] = data;
          setHistory({ ...history });

          let _data = {
            question,
            quiz: quizId,
            quizStatus: data.quizStatus,
            isCorrect,
          };
          props.onAnswer && props.onAnswer(_data);

          if (isExam) {
           //console.log("choosen selected");
            props.onChange && props.onChange(chosen);
            onNext();
            return;
          }

          global.http.post("/quiz-history-plain", _data).then((r) => {
           //console.log("qqqqq rrrrrr", r);
          });
          if (isCorrect) {
            onNext();
          }
         //console.log("qqqqq on submit Quiz", history[quizId]);
        }}
      ></QuizPreview>
      {items.length > 1 && (
        <>
          <hr />
          <button
            className={
              "btn btn-md btn-default default-button default-button-single"
            }
            onClick={() => {
              setSelectedInd((selectedInd + 1 + items.length) % items.length);
            }}
          >
            Следующий вопрос
          </button>
        </>
      )}
      {!isExam && (history[quizId] || {}).quizStatus == "bad" && (
        <>
          {/*{items.length > 1 && <>*/}
          {/*    <hr/>*/}
          {/*    <button className={'btn btn-md btn-default'} onClick={() => {*/}
          {/*        setSelectedInd((selectedInd + 1 + items.length) % items.length)*/}
          {/*    }}>Я запомнил, иду к след*/}
          {/*    </button>*/}
          {/*</>}*/}

          <QuestionDetails
            withoutShow={true}
            question={getSelectedQuestion()}
          ></QuestionDetails>
        </>
      )}
      {/*<hr/>*/}
      {/*<StarRating></StarRating>*/}
    </div>
  );
}

export default RunQuiz;
