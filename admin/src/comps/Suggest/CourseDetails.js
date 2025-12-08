import React, {useEffect, useState} from "react";
import _ from "underscore";

import {Link, Outlet} from "react-router-dom";
import CustomStorage from "./CustomStorage";
import PreviewCourseModule from "./PreviewCourseModule";
import Loader from "../Loader";
import Skeleton from "../../libs/Skeleton";
import './Course.css'
import MyImg from "../MyImg";
import ChatDetails from './ChatDetails'
function CourseDetails(props) {
    let [data, setData] = useState({});
    let [parentLoading, setParentLoading] = useState(true);
    let [loading, setLoading] = useState(true);

    let [qHistory, setQHistory] = useState({});
    let [mHistory, setMHistory] = useState({});
    let [dbQuestionsObj, setDBQuestionsObj] = useState({});
    let [selectedModuleInd, setSelectedModuleInd] = useState(0);
    let [selectedBlockInd, setSelectedBlockInd] = useState(0);
    let [open, setOpen] = useState(true);
    let [chatOpen, setChatOpen] = useState(false);

    let [activeInd, setActiveInd] = useState(0);
    let isAdmin = false;

    function getActiveInd(course, mHistory) {
        //console.log("coursesese", course, mHistory);
        let isBad = false;
        _.each(course.modules, (item, ind) => {
            let hist = mHistory[item.module];
            //console.log("hhhhhhhhhhh", mHistory);
            if (!isBad && hist && hist.status === "ok") {
                activeInd = ind + 1;
            } else {
                isBad = true;
            }
        });
        return activeInd;
    }

    useEffect(() => {
        // console.log("qqqqq rrrrrrr4444444444444 1.0");
        global.http
            .get("/get-my-course-details", {_id: CustomStorage.getId()})
            .then((r) => {
                // console.log("qqqqq rrrrrrr4444444444444 2.0");

                setLoading(false)
                setParentLoading(false)
                if (r.error) {
                    return alert(r.msg);
                }
                let {courseUser, course, dbQuestions} = r;
                let {mHistory, qHistory} = courseUser || {};
                mHistory ??= {};
                qHistory ??= {};
                let {modules = []} = course;
                let dbQuestionsObj = dbQuestions.reduce(
                    (acc, it) => ({...acc, [it._id]: it}),
                    {}
                );
                let activeInd = Math.min(
                    getActiveInd(courseUser, mHistory),
                    courseUser.modules.length - 1
                );
                setData(courseUser);
                setQHistory(qHistory);
                setMHistory(mHistory);
                setDBQuestionsObj(dbQuestionsObj);

                // console.log("qqqqq rrrrrrr4444444444444 3.0");
                // console.log(
                //   "rrrrrrr4444444444444 4.0",
                //   mHistory,
                //   activeInd,
                //   { courseUser },
                //   dbQuestionsObj
                // );
                setActiveInd(activeInd);
                setSelectedModuleInd(Math.min(activeInd, course.modules.length - 1));
            });
    }, []);

    function isOkFn(ind) {
        return isAdmin || ind <= activeInd;
    }

    let selectedModule = (data.modules || [])[selectedModuleInd] || {};
    let moduleId = (selectedModule || {}).module;
    mHistory ??= {};
    let hist = mHistory[moduleId] || {};
    let isOk = isOkFn(selectedModuleInd);
    let dbQuestions = ((selectedModule || {}).questions || []).map(
        (it) => dbQuestionsObj[it]
    );

    function getActiveQId() {
        let activeQInd = 0;
        let isBad;

        let questions = dbQuestions;
        _.each(questions || [], ({_id}, ind) => {
            let status = ((qHistory || {})[_id] || {}).status;
            if (status !== "ok") {
                isBad = true;
            }
            if (!isBad) {
                activeQInd = ind + 1;
            }
        });
        return activeQInd;
    }

    function isActiveOk(ind) {
        // return true;
        let questions = dbQuestions;
        if (isAdmin) {
            return true;
        }
        if (ind == -1) {
            return (
                activeQInd >= questions.length - 1 &&
                (
                    qHistory[
                    (questions[questions.length - 1] || {})._id || "_id_not_found"
                        ] || {}
                ).status == "ok"
            );
        }
        return activeQInd >= ind;
    }

    qHistory ??= {};
    let activeQInd = getActiveQId();
    let okCount = 0;

    let Comp = (<>
            <div className="card afade d6">
                <MyModal
                    size={'lg'}
                    woCard={true} isOpen={chatOpen} onClose={() => setChatOpen(false)}>
                  <ChatDetails></ChatDetails>
                </MyModal>
                <div className="card-body">
                    <div className="cmModulesList">
                        <h5>{t('availableMOdules')}</h5>
                        <hr/>
                        {parentLoading && <Skeleton  count={1} woLabel={true}> </Skeleton>}
                        {(data.modules || []).map((module, ind) => {
                            let isOk = isOkFn(ind);

                            // let selectedBlockInd = 0

                            let isActive = selectedModuleInd == ind;
                            let questions = dbQuestions;
                            //console.log("module", module);
                            let translateObj = {
                              //'Строки': 'Strings'
                            }
                            return (
                                <div
                                    className={
                                        " " +
                                        (isOk && open ? "isOk " : "isNotOk ") +
                                        // (isActive ? "activeBlock " : "") +
                                        (ind <= activeInd ? "opened" : "closed")
                                    }

                                >
                                    <a
                                        key={ind}

                                        className={"listBlockCh " + (isActive ? "activeBlock " : "")}
                                        onClick={(e) => {
                                            //console.log("qqqqq open module", ind, selectedModuleInd);
                                            if (selectedModuleInd != ind) {
                                                setSelectedModuleInd(ind);
                                                setSelectedBlockInd(getCurrentInd());
                                                setLoading(true);
                                                setOpen(true)
                                                setTimeout(() => {
                                                    setLoading(false);
                                                }, 100);
                                            } else {
                                                setOpen(!open)
                                            }


                                            e.preventDefault();
                                            e.stopPropagation();
                                            return null;
                                        }}
                                    >
                                        {!isOk && <div className="iconoir-lock icon-status"></div>}
                                        {isOk && activeInd !== ind &&
                                            <div className="iconoir-double-check icon-status"></div>}
                                        {isOk && activeInd === ind &&
                                            <div className="iconoir-double-check icon-status"></div>}
                                        {ind + 1}. {isOk ? translateObj[module.name] || module.name : `${t('module')} ` + (ind + 1)}
                                    </a>

                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>
            <div className="card afade d6">
                <div className="card-body">
                    <h5>{t('availableTopics')}</h5>
                    <hr/>

                    {parentLoading && <Skeleton  count={1} woLabel={true}> </Skeleton>}

                    {(data.modules || []).map((module, ind) => {
                        let isOk = isOkFn(ind);

                        // let selectedBlockInd = 0

                        let isActive = selectedModuleInd == ind;
                        let questions = dbQuestions;
                        //console.log("module", module);
                        let open = true;
                        let translateObj = {
                          'Проверка на полиндром': 'Polindrom check',
                          'Генерация правильно составленных скобок': 'String generations',
                          'Алгоритм функции `myAtoi(string s)`': 'Function algorithm myAtio(string s)'
                        }
                        return (
                            <div
                                key={ind}
                            >
                                {isOk && isActive && open && (
                                    <>
                                        <div className="">
                                            {/* {selectedBlockInd} */}
                                            <div className={"animChild"}>
                                                {(questions || []).map(
                                                    ({title, name, useCase, _id, facts}, ind) => {
                                                        let isOk = isActiveOk(ind);
                                                        okCount += 1

                                                        return (
                                                            <a
                                                                key={_id + "_" + ind}
                                                                className={
                                                                    "listBlockCh " +
                                                                    (selectedBlockInd === ind ? "activeBlock" : "")
                                                                }
                                                                style={{display: "block"}}
                                                                onClick={() => {
                                                                    // scrollToView("#block-" + ind)

                                                                    onSelectInd(ind);
                                                                }}
                                                            >
                                                                <>
                                                                    {!isOk && (
                                                                        <>
                                                                            <i className={"iconoir-lock icon-status"}></i>
                                                                            {t('topic')}
                                                                            #
                                                                            {ind + 1}
                                                                        </>
                                                                    )}
                                                                    {isOk && (
                                                                        <>
                                                                            <div
                                                                                className="iconoir-double-check icon-status"></div>
                                                                            {translateObj[title] || title || CustomStorage.pubName(name) || ""}
                                                                        </>
                                                                    )}
                                                                </>
                                                            </a>
                                                        );
                                                    }
                                                )}
                                                {
                                                    <>
                                                        <a
                                                            className={
                                                                "listBlockCh " +
                                                                (selectedBlockInd === -1 ? "activeBlock" : "")
                                                            }
                                                            onClick={() => {
                                                                onSelectInd(-1);
                                                            }}
                                                        >
                                                            <>
                                                                {!isActiveOk(-1) && (
                                                                    <i className={"iconoir-lock icon-status"}></i>
                                                                )}
                                                                {isActiveOk(-1) && (
                                                                    <div
                                                                        className="iconoir-double-check icon-status"></div>
                                                                )}{" "}
                                                                {t('doubleRepeatInformation')}
                                                            </>
                                                        </a>
                                                    </>
                                                }
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                    {!parentLoading && !okCount && <>
                    {t('hiddenInfo')}
                    </>}
                </div>
            </div>
        </>
    );
    // window.onRenderLeftMenu && window.onRenderLeftMenu(Comp);
    let isActive = isActiveOk(selectedBlockInd);
    let leng = ((selectedModule || {}).questions || []).length;

    function onOpenNext() {
        setSelectedModuleInd((selectedModuleInd + 1) % data.modules.length);
    }

    function onOpenNextQuestion(delta = 1) {
        let ind = (selectedBlockInd + delta + leng) % leng;
        if (delta > 0 && ind == 0) {
            ind = -1;
        }
        onSelectInd(ind);
        // setLoading(true)
        // setSelectedBlockInd(ind)
        // setTimeout(() => {
        //     setLoading(false)
        // }, 10)
    }

    function onSelectInd(ind) {
        setLoading(true);
        setSelectedBlockInd(ind);
        window.scrollTo(0, 0)
        setTimeout(() => {
            setLoading(false);
        }, 100);
    }

    function getCurrentInd() {
        return 0;
    }

    // let v = useActionData();
    //console.log(
    //    "qqq quizExamSize REND WRAP: qqqqq selectedModule",
    //    selectedBlockInd,
    //    selectedModuleInd
    //  );

    let isMod = moduleId && selectedModule && selectedModule._id
    // isMod = false;
    // isOk = false;
    return (
        <div className={"row"}>

            <div className="col-sm-8 order-sm-1">
                {!isMod && <div className={'card'}>
                    <div className="card-body tc">
                        {/*Подгружаем модуль ...*/}
                        <div style={{marginTop: '20px'}}>
                            <Skeleton count={3}></Skeleton>
                        </div>
                    </div>
                </div>}
                {isMod && (
                    <>
                        {/*<div className="card">*/}
                        {/*    <div className="card-body">*/}
                        {isOk && (
                            <PreviewCourseModule
                                onChangeInd={(delta) => {
                                    onOpenNextQuestion(delta);
                                }}
                                selectedBlockInd={selectedBlockInd}
                                isActive={{status: isActive}}
                                loading={loading}
                                selectedBlock={
                                    dbQuestionsObj[
                                        data.modules[selectedModuleInd].questions[selectedBlockInd]
                                        ]
                                }
                                qHistory={qHistory || {}}
                                mHistory={mHistory || {}}
                                questions={dbQuestions}
                                courseUserId={data._id}
                                isAdmin={isAdmin}
                                isLastModule={
                                    selectedModuleInd === ((data || {}).modules || []).length - 1
                                }
                                moduleId={selectedModule.module}
                                onChangeQHistory={(r) => {
                                    //console.log("qqqqq qhistoyr before", qHistory);
                                    qHistory ??= {};
                                    qHistory = {...qHistory, ...r};
                                    //console.log("qqqqq qhistoyr after", qHistory);
                                    setQHistory(qHistory);
                                    onOpenNextQuestion();
                                }}
                                onChangeMHistory={(r, cb) => {
                                    //console.log("qqqqq CHANGE MHISTORYYYYYYYYYYYYYYYYYYYY", r);
                                    mHistory ??= {};
                                    mHistory = {...mHistory, ...r};
                                    setMHistory(mHistory);
                                    let ind = Math.min(
                                        getActiveInd(data, mHistory),
                                        data.modules.length - 1
                                    );
                                    setActiveInd(ind);
                                    setSelectedModuleInd(ind);
                                    setSelectedBlockInd(0);
                                    cb && cb();
                                    // onOpenNext()
                                }}
                                onOpenNextModule={() => {
                                    //console.log("777777 qqqqq open next module");
                                    onOpenNext();
                                }}
                                // questions={selectedModule.questions.map(_id => dbQuestionsObj[_id])}
                            ></PreviewCourseModule>
                        )}
                        {!isOk && (
                            <EmptyModule></EmptyModule>
                        )}
                        {/*    </div>*/}
                        {/*</div>*/}
                    </>
                )}
            </div>
            <div className="order-sm-2 col-sm-4 sticky animchild">

                {Comp}

                {/*<div className="card  afade d8">*/}
                {/*    <div className="card-body">*/}
                {/*        Инофрмация о комментах*/}
                {/*    </div>*/}
                {/*</div>*/}

            </div>
            {/* {leng} */}

        </div>
    );
}

export function EmptyModule() {
    return <>
        <div className={'card'}>
            <div className={'card-body'}>
                <div className={"emptyModule"}>
                    <MyImg bottom={50}>lock</MyImg>

                    {t('openNextMsg')}
                </div>
            </div>
        </div>

    </>
}

export default CourseDetails;
