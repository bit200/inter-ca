import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import _ from "underscore";
import Button from "libs/Button";
import MyModal from "libs/MyModal";
import { Link, Outlet } from "react-router-dom";
import QuizQuestion from "./QuizQuestion";
import Select from "libs/Select";
import IsFavorite from "../IsFavorite";
import UseLocalStorage from "libs/UseLocalStorage";
import CustomStorage from "./CustomStorage";
import QuestionDetails from "./QuestionDetails";
import "./quiz.css";
import Smart from "libs/Smart";
import RunQuiz from "./RunQuiz";
import QuizTraining from "./QuizTraining";
import MdPreview from "./MdPreview";
import Loading from "../../libs/Loading/Loading";

let changeStatus = CustomStorage.changeStatus;
let sortQuestions = CustomStorage.sortQuestions;
let backListener;
let isAdmin = global.env.isAdmin;
let pubName = CustomStorage.pubName;

let question_statuses = [
  { name: "Новый", status: "", desc: "1-2 дня" },
  { name: "Плохо", status: "bad", desc: "1-2 дня" },
  { name: "Норм", status: "norm", desc: "3-4 дня" },
  { name: "Хорошо", status: "good", desc: "8-10 дней" },
  { name: "Очень хорошо", status: "very_good", desc: "30 дней" },
];
let questionFilters = {
  "~1d": { name: "Сегодня", start: 0, end: 1 },
  "~2d": { name: "Вчера", start: 1, end: 2 },
  "~3d": { name: "Позавчера", start: 2, end: 3 },
  "2d": { name: "2 дня", start: 0, end: 2 },
  "3d": { name: "3 дня", start: 0, end: 3 },
  "7d": { name: "7 дней", start: 0, end: 7 },
  "14d": { name: "14 дней", start: 0, end: 14 },
  "31d": { name: "31 день", start: 0, end: 31 },
  "90d": { name: "90 дней", start: 0, end: 90 },
  "> 1d": { name: "> 1 дня", start: 1, end: -1 },
  "> 2d": { name: "> 2 дней", start: 2, end: -1 },
  "> 3d": { name: "> 3 дней", start: 3, end: -1 },
  "> 7d": { name: "> 7 дней", start: 7, end: -1 },
  "> 14d": { name: "> 14 дней", start: 14, end: -1 },
  "> 31d": { name: "> 31 дня", start: 31, end: -1 },
  "> 90d": { name: "> 90 дней", start: 90, end: -1 },
};

function getCountsByTags(selectedTags, historyObj, questions) {
  let DEFAULT_STATUS = "bad";
  let counts = {
    good: 0,
    bad: 0,
    norm: 0,
    very_good: 0,
    total: 0,
    percAbs: 0,
    totalRepeat: 0,
  };
  let timers = { good: 2, bad: 0, norm: 1, very_good: 3 };
  let byTags = {};

  function getDelta(status, isLast) {
    return timers[status] * (isLast ? 0.7 : 1);
  }

  function setTag(tag, status, isLast) {
    byTags[tag] = byTags[tag] || {};
    byTags[tag][status] = (byTags[tag][status] || 0) + 1;
    byTags[tag].total = (byTags[tag].total || 0) + 1;
    byTags[tag].totalRepeat = (byTags[tag].totalRepeat || 0) + (isLast ? 1 : 0);
    byTags[tag].percAbs = (byTags[tag].percAbs || 0) + getDelta(status, isLast);
  }

  let cd = new Date().getTime();

  _.each(questions, (item, ind) => {
    let status = (historyObj[item._id] || {}).status || DEFAULT_STATUS;
    let nextCd = (historyObj[item._id] || {}).nextCd || 0;
    let isLast = cd > nextCd;

    counts[status]++;
    counts.total++;
    counts.totalRepeat += isLast ? 1 : 0;
    counts.percAbs += getDelta(status, isLast);

    if ((item.hashTags || []).length) {
      _.each(item.hashTags, (tag, ind) => {
        setTag(tag, status, isLast);
      });
    } else {
      setTag("empty", status, isLast);
    }
  });

  function setPerc(item) {
    item.perc = Math.round(
      (100 * (item.percAbs || 0)) / (item.total * timers.very_good || 1)
    );
  }

  let countsWithTags = {};

  _.each(byTags, (item, tagId) => {
    setPerc(item);
    if (!selectedTags || selectedTags[tagId]) {
      // console.log("qqqqq tagId", tagId, selectedTags[tagId]);

      ["good", "norm", "bad", "total", "very_good", "percAbs"].forEach(
        (key) => {
          countsWithTags[key] =
            (countsWithTags[key] || 0) + ((byTags[tagId] || {})[key] || 0);
        }
      );
    }
  });

  setPerc(counts);
  setPerc(countsWithTags);

  return { counts, countsWithTags, byTags };
}

function Table(props) {
  let [selectedTags, setSelectedTags] = UseLocalStorage("selectedTags", {});
  let categories = CustomStorage.getCategoriesPlain();

  let [quizTab, setQuizTab] = useState(false);
  let [sprint, setSprint] = useState(0);
  let [sorting, setSorting] = useState("");
  let [filtering, setFiltering] = useState("");
  let [taskType, setTaskType] = useState("");
  let [search, setSearch] = useState("");
  let [selectedSprint, setSelectedSprint] = useState(0);
  let [sprints, setSprints] = useState([]);
  let [questions, setQuestions] = useState([]);
  let [filteredQuestions, setFilteredQuestions] = useState([]);
  let [selectedCategory, setSelectedCategory] = useState("");
  let [isStar, setIsStar] = useState(false);
  let [classView, setClassView] = useState(3);
  let [selectedQuestions, setSelectedQuestions] = useState([]);
  let [selectedQuestionsInd, setSelectedQuestionsInd] = useState(0);
  let [historyObj, setHistoryObj] = useState([]);
  let [sortIds, setSortIds] = useState({});
  let [loading, setLoading] = useState({});

  let [isShown, setIsShown] = useState(0);
  let [quizQuestions, setQuizQuestions] = useState([]);
  let [activeInd, setActiveInd] = useState(0);
  let { counts, countsWithTags, byTags } = CustomStorage.getCountsByTags(
    null,
    historyObj,
    questions
  );
  const navigate = useNavigate();

  // let [isShown, setIsShown] = useState(0)
  let QUIZ_QUESTIONS_LENGTH = 5;
  global.historyObj = historyObj;
  global.setHistoryObj = setHistoryObj;
  window.myOwnQuestions = questions;

  // console.log("qqqqq v", categories);

  useEffect(() => {
    smartFilterAndSearch();
  }, [sorting, search, filtering]);

  function onSetSearch(search) {
    setSearch(search);
  }

  window.allQuestions = questions;

  function smartFilterAndSearch() {
    if (!search) {
      return setFilteredQuestions(
        sortQuestions([...questions], historyObj, {
          sortIds,
          sorting,
          filtering,
        })
      );
    }
    let replacer = {
      q: "й",
      w: "ц",
      e: "у",
      r: "к",
      t: "е",
      y: "н",
      u: "г",
      i: "ш",
      o: "щ",
      p: "з",
      "[": "х",
      "]": "ъ",
      a: "ф",
      s: "ы",
      d: "в",
      f: "а",
      g: "п",
      h: "р",
      j: "о",
      k: "л",
      l: "д",
      ";": "ж",
      "'": "э",
      z: "я",
      x: "ч",
      c: "с",
      v: "м",
      b: "и",
      n: "т",
      m: "ь",
      ",": "б",
      ".": "ю",
      "/": ".",
    };

    _.each(replacer, (it, key) => (replacer[it] = key));

    let regs = search.split(" ").map((search) => {
      return {
        v1: new RegExp(search, "gi"),
        v2: new RegExp(
          search.replace(/[A-zА-я/,.;\'\]\[]/gi, function (x) {
            return replacer[x];
          }),
          "gi"
        ),
      };
    });

    filteredQuestions = questions.filter((it) => {
      let isBad = false;
      regs.forEach((reg) => {
        isBad = isBad || (!reg.v1.test(it.name) && !reg.v2.test(it.name));
      });
      return !isBad;
    });
    setFilteredQuestions(
      sortQuestions([...filteredQuestions], historyObj, {
        sortIds,
        sorting,
        filtering,
      })
    );
  }

  function setFQuestions({
    selectedCategory,
    _sortIds,
    questions,
    selectedSprint,
    taskType,
    histObj,
  }) {
    let sprint = sprints.filter((it) => it._id == selectedSprint)[0];
    let hashTag = selectedCategory;

    let _questions = [...questions].filter((it) => {
      if (sprint && sprint.questions.indexOf(it._id) < 0) {
        return false;
      }
      if (hashTag && it.hashTags.indexOf(hashTag) < 0) {
        return false;
      }
      if (taskType && (it.type || "question") !== taskType) {
        return false;
      }
      return true;
    });
    setFilteredQuestions(
      sortQuestions(_questions, histObj || historyObj, {
        sortIds: _sortIds || sortIds,
        sorting,
        filtering,
      })
    );
  }

  // useEffect(changeUserFn, [])
  useEffect(changeUserFn, [(props || {}).user]);

  function changeUserFn() {
    setLoading(true);
    CustomStorage.loadMySprints(
      isAdmin ? props.user : null,
      ({ questions, sprints, _ids, history }) => {
        setLoading(false);

        let sortIds = _ids.reduce((acc, _id, ind) => {
          return { ...acc, [_id]: ind };
        }, {});
        setSortIds(sortIds);
        // questions = _.sortBy(questions, it => sortIds[it._id])
        let historyObj = {};
        _.each(history, (item, ind) => {
          historyObj[item.question] = item;
        });

        // console.log('222131aaaaa questions',sortIds,  questions.map(it => it._id))

        // setQuestions(questions.filter(({hashTags}) => {
        //     let isOk = false;
        //     _.each(hashTags, (tag, ind) => {
        //         isOk = isOk || selectedTags[tag];
        //     })
        //     return isOk;
        // }));

        setQuestions(questions);
        setHistoryObj(historyObj);
        setFQuestions({
          selectedSprint,
          selectedCategory,
          _sortIds: sortIds,
          questions,
          histObj: historyObj,
        });
        setSprints(sprints);
        // openQuestion(3, questions)
      }
    );
  }

  // function fakeOpen(filtered_items, ind) {
  //     modal.show();
  //     setIsShown(0);
  //     setSelectedQuestions(filtered_items);
  //     setSelectedQuestionsInd(ind);
  // }
  function pub(v) {
    return v < 9 ? "0" + v : v;
  }

  function pubDate(it) {
    let cd = new Date(it);

    return `${[pub(cd.getDate()), pub(cd.getMonth() + 1)].join("/")} ${pub(
      cd.getHours()
    )}:${pub(cd.getMinutes())}`;
  }

  function tableAdminPubDate(it) {
    if (!it) {
      return "-";
    }
    let cd = new Date(it);
    let _cd = new Date();
    return Math.round((cd - _cd) / (1000 * 24 * 3600));

    return `${[pub(cd.getDate()), pub(cd.getMonth() + 1)].join("/")}`;
  }

  let items = [
    { name: "Все", _id: "" },
    ...categories.map((it) => {
      return {
        name: it.title + ` (${(byTags[it._id] || {}).total || "0"})`,
        _id: it._id,
      };
    }),
  ];

  let sprintItems = [
    { name: "Все", _id: "" },
    ...sprints.map((it) => {
      return {
        name: `${it.name || ""} ${pubDate(it.cd)} #${it._id} (${
          (it.questions || []).length
        })`,
        _id: it._id,
      };
    }),
  ];

  let perc =
    Math.round(
      (100 *
        filteredQuestions.reduce((acc, item) => {
          let points = { norm: 1, good: 2, very_good: 3 };
          return acc + (points[(historyObj[item._id] || {}).status || ""] || 0);
        }, 0)) /
        (3 * filteredQuestions.length || 1)
    ) + "%";

  let modal = useRef(null);

  function openQuestion(ind, filtered_items) {
    modal.current.show();
    setIsShown(0);
    setSelectedQuestions(filtered_items);
    setSelectedQuestionsInd(ind);
    setQuizTab(false);
  }

  let selQuestion = selectedQuestions[selectedQuestionsInd] || {};
  let isJs = (selectedQuestions[selectedQuestionsInd] || {}).type === "js-task";
  let isNext = selectedQuestions.length > 1;

  return (
    <div>
      <div className="row">
        {/*<Link to={'/quiz/' + (selectedCategory || 'all')} onClick={(scb) => {*/}
        {/*    scb && scb()*/}
        {/*    setQuizQuestions([...questions.slice(0, QUIZ_QUESTIONS_LENGTH)])*/}
        {/*}}>*/}
        {/*    Начать повторение (Рекомендуемых)</Link>*/}
        {/*<hr/>*/}

        <div className="col-sm-12 selectorsWrap filtersWrap">
          <div className={"card-item"}>
            <div className="ib">
              <small>Поиск по вопросам</small>
              <input
                type="text"
                placeholder={"Поиск по вопросам ..."}
                value={search}
                className="table-search"
                onChange={(e) => onSetSearch(e.target.value)}
              />
            </div>
            <div className="ib">
              <small>Спринт</small>
              <Select
                value={selectedSprint}
                items={sprintItems}
                onChange={(sprint) => {
                  setSelectedSprint(+sprint);
                  setFQuestions({
                    selectedSprint: sprint,
                    selectedCategory,
                    questions,
                  });
                }}
              ></Select>
            </div>

            <div className="ib">
              <small>Сортировка</small>
              <Select
                value={sorting}
                items={[
                  "",
                  { value: "Original", name: "Оригинал спринта" },
                  { value: "Last Touch", name: "Последнее повторение" },
                  { value: "-Last Touch", name: "Последнее повторение (убыв)" },
                  { value: "AI Next Touch", name: "AI след дата повторения" },
                  {
                    value: "-AI Next Touch",
                    name: "AI след дата повторения (убыв)",
                  },
                  { value: "Attempts", name: "Кол-во повторений" },
                  { value: "-Attempts", name: "Кол-во повторений (убыв)" },
                  { value: "Popular", name: "Популярность в интервью" },
                  { value: "-Popular", name: "Популярность в интервью (убыв)" },
                  "Attempts",
                  "-Attempts",
                  "Popular",
                  "-Popular",
                ]}
                onChange={(it) => {
                  setSorting(it.key || it);
                }}
              ></Select>
            </div>
            <div className="ib">
              <small>Фильтр</small>
              <Select
                value={filtering}
                items={[
                  "",
                  ...Object.keys(questionFilters).map((key) => {
                    let item = questionFilters[key];
                    return { ...item, value: key };
                  }),
                ]}
                onChange={(it) => {
                  setFiltering(it);
                }}
              ></Select>
            </div>
            <div className="ib">
              <small>Тэг</small>
              <Select
                value={selectedCategory}
                items={items}
                onChange={(it) => {
                  let selectedCategory = +it == it ? +it : "";
                 //console.log("qqqqq itititit", it, selectedCategory);
                  setSelectedCategory(selectedCategory);
                  setFQuestions({
                    selectedSprint,
                    selectedCategory,
                    questions,
                    taskType,
                  });
                }}
              ></Select>
            </div>

            {/* <div className="ib">
                        <div style={{marginTop: '25px'}}>
                            <a className={'ml15'} onClick={() => {
                                setClassView(classView == 12 ? 3 : 12)
                            }}>Toggle View
                            </a></div>
                    </div> */}

            <div
              style={{
                marginTop: "10px",
                display: "flex",
                alignItems: "center",
              }}
            >
              Вопросы:{" "}
              <strong>
                {filteredQuestions.length}{" "}
                {filteredQuestions.length !== questions.length && (
                  <>из {questions.length}</>
                )}
              </strong>
              <span
                style={{
                  marginLeft: "20px",
                  display: "inline-block",
                }}
              >
                Процент изучения: <strong>{perc}</strong>
              </span>
              <div className="ib" style={{ marginLeft: "20px" }}>
                <QuizTraining></QuizTraining>
              </div>
              <div className="ib" style={{ marginLeft: "20px" }}>
                <Smart
                  items={[
                    {
                      size: 12,
                      name: "Type",
                      key: "type",
                      type: "group",
                      list: [
                        { name: "Все", key: "" },
                        { name: "Вопросы", key: "question" },
                        { name: "Теор Задачи", key: "task" },
                        { name: "Задачи с запуском", key: "js-task" },
                      ],
                    },
                  ]}
                  obj={{ type: taskType }}
                  onChange={(v, key) => {
                    taskType = v.type;
                    setTaskType(taskType);
                    setFQuestions({
                      selectedSprint,
                      selectedCategory,
                      questions,
                      taskType,
                    });
                  }}
                ></Smart>
              </div>
            </div>
          </div>
        </div>
        {/*{selectedCategory}*/}

        <div className="question-parent-group-wrap">
          {(question_statuses || []).map(({ status, name }, ind) => {
            let filtered_items = _.filter(filteredQuestions, (it) => {
              let quest_status = (historyObj[it._id] || {}).status || "";
              return status === quest_status;
            });

            function getPerc() {
              return (
                Math.round(
                  (100 * filtered_items.length) /
                    (filteredQuestions.length || 1)
                ) + "%"
              );
            }

            function isJSType(it) {
              return /task/gi.test(it.type);
            }

            let width =
              classView == 12
                ? "100%"
                : 100 / (question_statuses.length || 1) + "%";
            return (
              <div
                key={ind}
                style={{ width }}
                className={
                  "question-group-wrap " + (classView == 12 ? "fullView" : "")
                }
              >
                <div className="status-title">
                  <div className="statusProgress">
                    <div
                      className="progressLine"
                      style={{ width: getPerc() }}
                    ></div>
                  </div>
                  {name} [x{filtered_items.length}]{/*<div></div>*/}
                  {/*<Link to={'/quiz/' + (status || 'all') + '/' + (selectedSprint || 'all')}><Button*/}
                  {/*    size={'xs'}*/}
                  {/*    onClick={(scb) => {*/}
                  {/*        scb && scb()*/}
                  {/*        setQuizQuestions([...filtered_items.slice(0, QUIZ_QUESTIONS_LENGTH)])*/}
                  {/*    }}>*/}
                  {/*    Start*/}
                  {/*</Button></Link>*/}
                </div>
                <div className="animChild">
                  {(filtered_items || []).map((it, ind) => {
                    let hist = historyObj[it._id] || {};
                    let _isJs = isJSType(it);

                    return (
                      <div
                        key={ind}
                        className={
                          "quiz-status-q " +
                          (it.type === "js-task" ? "js-task-table" : "")
                        }
                        onClick={() => {
                          openQuestion(ind, filtered_items);
                        }}
                      >
                        <div className="pull-right">
                          <IsFavorite
                            size={15}
                            question={it}
                            item={hist}
                          ></IsFavorite>
                        </div>
                        {_isJs && (
                          <i
                            className="fa fa-file-code-o"
                            aria-hidden="true"
                            style={{
                              marginRight: "5px",
                              marginTop: "0",
                              float: "left",
                            }}
                          ></i>
                        )}
                        {pubName(it.name || "-")}

                        <div className={"tableStatuses"}>
                          {isAdmin && (
                            <>
                              <small title={"Quiz Perc"}>
                                {Math.round(hist.quizPerc)}%
                              </small>
                              <small title={"Last Touch"}>
                                {tableAdminPubDate(hist.lastCd)}
                              </small>
                              <small title={"AI next Touch"}>
                                {tableAdminPubDate(hist.nextCd)}
                              </small>
                              <small title={"Кол-во Повторений"}>
                                {hist.attempts}{" "}
                              </small>
                              <small title={"Кол-во в интервью"}>
                                {it.interviewsCount}
                              </small>
                            </>
                          )}
                          {it.quizCount && (
                            <div className="quizPerc">
                              <div
                                className={
                                  "quizPercSize " +
                                  (!hist.quizPerc && hist.quizPerc != "0"
                                    ? ""
                                    : hist.quizPerc < 50
                                    ? "incorrectDot"
                                    : "correctDot")
                                }
                                style={{ width: hist.quizPerc + "%" }}
                              ></div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <Loading loading={loading}></Loading>
        </div>
        <MyModal title={""} size={"full"} ref={modal}>
          {
            <div className="card-default-button-wrapper">
              <button
                className={"btn btn-xs btn-default default-button"}
                disabled={!isNext}
                onClick={(scb) => {
                  setSelectedQuestionsInd(
                    (selectedQuestionsInd - 1 + selectedQuestions.length) %
                      selectedQuestions.length
                  );
                  setQuizTab(false);
                }}
              >
                Пред вопрос
              </button>
              <button
                className={"btn btn-xs btn-default default-button"}
                disabled={!isNext}
                onClick={(s) => {
                  setSelectedQuestionsInd(
                    (selectedQuestionsInd + 1) % selectedQuestions.length
                  );
                  setQuizTab(false);
                }}
              >
                След вопрос
              </button>
              {isJs && (
                <Link
                  className="ib"
                  to={
                    "/run?question=" +
                    (selectedQuestions[selectedQuestionsInd] || {})._id
                  }
                >
                  <button
                    className={
                      "btn btn-xs btn-primary  default-button default-button-single"
                    }
                  >
                    Запустить редактор
                  </button>
                </Link>
              )}
              {selQuestion.quizCount && (
                <button
                  className={
                    "btn btn-xs btn-primary default-button default-button-quiz"
                  }
                  onClick={() => {
                    setQuizTab(!quizTab);
                  }}
                >
                  {quizTab
                    ? "Вернуться к вопросу"
                    : `Пройти квиз по теме (${Math.round(
                        (historyObj[selQuestion._id] || {}).quizPerc || ""
                      )}%)`}
                </button>
              )}
            </div>
          }
          {quizTab && (
            <>
              <RunQuiz
                onChange={(v) => {
                 //console.log("change Quiz props", v);
                }}
                // isExam={true}
                question={(selectedQuestions[selectedQuestionsInd] || {})._id}
              ></RunQuiz>
            </>
          )}
          {!quizTab && (
            <>
              <QuizQuestion
                question={selectedQuestions[selectedQuestionsInd]}
                onChange={(q) => {
                  setIsShown(1);
                  setSelectedQuestionsInd(
                    (selectedQuestionsInd + 1) % selectedQuestions.length
                  );
                }}
              ></QuizQuestion>

              <hr />
              <QuestionDetails
                question={selectedQuestions[selectedQuestionsInd]}
              ></QuestionDetails>
            </>
          )}
        </MyModal>
      </div>
    </div>
  );
}

export default Table;
let statuses = question_statuses;
export { questionFilters, statuses };
