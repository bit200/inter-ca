import React, { useState, useEffect } from "react";
import MDEditor from "@uiw/react-md-editor";
import "./QuestionDetails.css";
import { generateSuggestion } from "./SuggestionItem";
import Tree from "../Tree";
import MyModal from "libs/MyModal/MyModal";
import { Link, Outlet } from "react-router-dom";
import QuestionsListWithSelect from "./QuestionsListWithSelect";
import MdPreview from "./MdPreview";

function FindDuplicate(props) {
  let [original, setOriginal] = useState(null);
  let [duplicate, setDuplicate] = useState(null);
  let [isModal, setIsModal] = useState(false);
  let [allQuestions, setAllQuestions] = useState([]);

  useEffect(() => {
    setOriginal(props.original);
  }, [props.original]);

  function generateDublicate(question) {
    setIsModal(true);
    if (!allQuestions.length) {
     //console.log("qqqqq LOAD ALL QUESTIONS LOGIC FOR FUTURE .... ");
      Storage.loadAllQuestions((items) => {
        setAllQuestions(items);
      });
    }
  }

  original = original || props.original;
  let duplicateId = (duplicate || {})._id;
  allQuestions =
    allQuestions && allQuestions.length
      ? allQuestions
      : window.myOwnQuestions || [];

  return (
    <>
      {/*<button*/}
      {/*  className={"btn btn-xs btn-light"}*/}
      {/*  onClick={() => {*/}
      {/*    generateDublicate();*/}
      {/*  }}*/}
      {/*>*/}
      {/*  Это дубликат?*/}
      {/*</button>*/}
      {isModal && (
        <MyModal
          isOpen={isModal}
          onClose={() => {
            setIsModal(false);
          }}
        >
          <small>
            <strong>Вопрос:</strong>
          </small>
          <div>{original.name}</div>
          <div
            onClick={() => {
              setOriginal(duplicate);
              setDuplicate(original);
            }}
          >
            <div style={{ rotate: "90deg" }} className="fa fa-exchange"></div>
          </div>
          <small>
            <strong>Найденый дубликат:</strong>
          </small>
          <div>{(duplicate || {}).name}</div>
          <hr />
          <button
            className={"btn btn-xs btn-primary"}
            onClick={() => {
              if (!duplicate || !duplicate._id) {
                alert("Выберите вопрос - дубликат");
                return;
              }
             //console.log("qqqqq send duplicate to moderator");
              setIsModal(false);

              global.http
                .get("/send-duplicates", { original, duplicate })
                .then((r) => {
                 //console.log("qqqqq duplicates suggestion is saved", r);
                });
            }}
          >
            Отправить найденный дубликат модератору
          </button>
          {/*<button className={'btn btn-xs btn-default'} onClick={() => {*/}
          {/*    setOriginal(duplicate)*/}
          {/*    setDuplicate(original)*/}
          {/*}*/}
          {/*}>Поменять оригинал {'<->'} дубликат</button>*/}
          <hr />

          <QuestionsListWithSelect
            selectedQuestionId={(duplicate || {})._id}
            onChange={(id, question) => setDuplicate(question)}
            hashTags={[]}
            questions={allQuestions}
          ></QuestionsListWithSelect>
        </MyModal>
      )}
    </>
  );
}

function QuestionDetails(props) {
  let { question, questionId } = props;
  let [dbQuestion, setDbQusetion] = useState(null);
  let isJs = (question || {}).type === "js-task";

  question = question || dbQuestion;

  useEffect(() => {
    setShowSolution(props.showSolution || props.withoutShow);
  }, [(question || {})._id]);

  useEffect(() => {
    questionId &&
      global.http
        .get("/load-question-from-exam", { question: questionId })
        .then(({ question }) => {
          setDbQusetion(question);
        });
  }, [questionId]);

  let [showSolution, setShowSolution] = useState(
    props.showSolution || props.withoutShow
  );
  let { answer, name, facts = [], useCases = [] } = question || {};
  let size = facts.length && useCases.length ? 12 : 12;

  showSolution = showSolution || props.withoutShow;

  if (!question) {
    return <></>;
  }
  return (
    <div className={"detailedAnswer fadeIn"} data-color-mode="light">
      {props.showName && (
        <div className={""}>
          <MDEditor.Markdown source={name} />
          <hr />
          {false && (
            <h2 style={{ padding: "15px 0 30px 0", fontSize: "30px" }}>
              Ответ:{" "}
            </h2>
          )}
        </div>
      )}

      {!props.withoutShow && (
        <div className={"pull-left"}>
          <button
            className={
              "btn btn-xs btn-default default-button default-button-single"
            }
            onClick={() => {
              setShowSolution(!showSolution);
            }}
          >
            {!showSolution ? "Показать" : "Скрыть"} решение
          </button>
        </div>
      )}
      {showSolution && !props.woSuggestions && (
        <div className="w100 tr default-button-wrapper">
          <FindDuplicate original={question}></FindDuplicate>

          <h2 className={'pull-left'}>{t('theoryExplain')}</h2>
          <button
            className={"btn btn-sm btn-light"}
            onClick={() => {
              generateSuggestion(question);
            }}
          >
            <i className="iconoir-developer"></i>
            {t('suggestOwn')}
          </button>
          <hr/>
        </div>
      )}
      {showSolution && (
        <div className={"row"} style={{ paddingTop: "0" }}>
          {answer && (
            <div className={"col-sm-12 mt20"}>
              <MdPreview source={answer}></MdPreview>
            </div>
          )}
          <div className="col-sm-12">
            <Videos items={question.videos}></Videos>
          </div>
          <div className={"col-sm-" + size}>
            <ListUseCases items={facts}></ListUseCases>
          </div>
          <div className={"col-sm-" + size}>
            <ListUseCases items={useCases}></ListUseCases>
          </div>
          {!answer && !(facts || []).length && !(useCases || []).length && (
            <div
              className={"col-sm-12 tc mb-20"}
              style={{ marginBottom: "20px" }}
            >
              Решение в процессе формирования ...{" "}
            </div>
          )}
          {!props.woSuggestions && (
            <div className="col-sm-12">
              <SuggestedVariants _id={question._id}></SuggestedVariants>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SuggestedVariants(props) {
  let [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    setSuggestions([]);
    global.http
      .get("/load-suggestions", { question: props._id })
      .then((items) => {
        setSuggestions(items);
      });
  }, [props._id]);

  let userId = global.user.get_id();
  let isAdmin = global.user.is_role("admin");

  return suggestions && !!suggestions.length ? (
    <div>
      <hr />
      <div
        className={"quiz-title temp-anwer-wrapper w100"}
        style={{ maxWidth: "100%", padding: "10px 0" }}
      >
        Предлагаемые варианты (непроверенные куратором / CTO)
      </div>
      {(suggestions || []).map((it, ind) => {
       //console.log("qqqqq it", it);
        return (
          <div key={ind}>
            {/*{(isAdmin || userId == it.user) && (*/}
            {/*  <Link to={"/suggestions/" + it._id} className="pull-right">*/}
            {/*    <button*/}
            {/*      style={{ color: "white" }}*/}
            {/*      className={"btn btn-xs btn-default"}*/}
            {/*      style={{ color: "black" }}*/}
            {/*    >*/}
            {/*      Редактировать предложение*/}
            {/*    </button>*/}
            {/*  </Link>*/}
            {/*)}*/}
            <div className="label label-primary" style={{ marginRight: "5px" }}>
              Вариант №{ind + 1}
            </div>
            {/*<div className="label label-primary">*/}
            {/*  <Link to={"/suggestions/" + it._id} style={{ color: "white" }}>*/}
            {/*    {it.status}*/}
            {/*  </Link>*/}
            {/*</div>*/}

            {/*<strong>Вариант №{ind + 1}. Статус: <Link to={"/suggestions/" + it._id}>{it.status}</Link></strong>*/}
            <div className="variant-sep"></div>

            <QuestionDetails
              withoutShow={true}
              question={it.suggest}
              woSuggestions={true}
            ></QuestionDetails>
          </div>
        );
      })}
    </div>
  ) : null;
}

function Videos(props) {
  let width = 180;
  let height = 120;
  let { items } = props;
  let modal;
  let [youtubeModal, setYoutubeModal] = useState(false);

  function openYoutubeModal() {
    setYoutubeModal(true);
  }

  function youtube_parser(url) {
    url = url || "";
    var regExp =
      /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    var match = url.match(regExp);
    return match && match[7].length == 11 ? match[7] : false;
  }

  return items && items.length ? (
    <div className={"videos-wrapper"}>
      {(items || []).map((it, ind) => {
        let { href, name } = it;
        let youtubeID = youtube_parser(href); //'--qiegimDZM'
        return (
          <div key={ind} className={"ib"}>
            {/* <iframe src="https://drive.google.com/file/d/1oP9sHMH4Sq9fH-p_FyCUElzWtMo_WGst/view"/> */}
            <div className="ib" onClick={openYoutubeModal}>
              {youtubeID && (
                <div
                  className="youtubePreview"
                  style={{ width: width + "px", height: height + "px" }}
                >
                  <iframe
                    width={width + "px"}
                    height={height + "px"}
                    src={"https://www.youtube.com/embed/" + youtubeID}
                    title={name || href}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  ></iframe>
                </div>
              )}
            </div>
            <div className="ib">
              {!youtubeID && (
                <a
                  href={it.href}
                  target={"_blank"}
                  style={{ width: width + "px", height: height + "px" }}
                  className={"youtubePreview"}
                >
                  <i className="fa fa-play"></i>
                  <span>{it.name || it.href}</span>
                </a>
              )}
              {/*{it.name} {it.href}*/}
            </div>

            {youtubeModal && (
              <div className="modalWrapper">
                <MyModal
                  ref={(_this) => {
                    modal = _this;
                  }}
                  size={"full"}
                  defClass={"video-preview-modal"}
                  isOpen={true}
                  onClose={() => {
                    setYoutubeModal(false);
                  }}
                >
                  <div className={"modalPreview"}>
                    <iframe
                      width={"100%"}
                      height={"100%"}
                      src={
                        "https://www.youtube.com/embed/" +
                        youtubeID +
                        "?autoplay=1"
                      }
                      title={name || href}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    ></iframe>
                  </div>
                </MyModal>
              </div>
            )}
          </div>
        );
      })}
    </div>
  ) : null;
}

function ListUseCases(props) {
  return (
    <div>
      {(props.items || []).map((it, ind) => {
        return (
          <div key={ind}>
            <div className={"list-md-title"}>{it.name || "-"}</div>
            <MDEditor.Markdown data-color-mode="light" source={it.desc} />
            <Videos items={it.videos}></Videos>
          </div>
        );
      })}
    </div>
  );
}

export {Videos};
export default QuestionDetails;
