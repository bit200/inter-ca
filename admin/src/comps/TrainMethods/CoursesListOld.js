import React, {useEffect, useState} from "react";
import _ from "underscore";
import "./CoursesList.css";
import {Link, Outlet} from "react-router-dom";
import MyImg from './../MyImg'
import Perc from "./../Suggest/Perc";
import Button from "libs/Button";
import CircularProgress2 from "./Comps/CircularProgress2";
import Skeleton from "../../libs/Skeleton";

export function NewPerc({perc}) {
    let _perc = +perc;
    let arr = [1,2,3,4,5, 6]
    let onePerc = 100 / arr.length;
    let count = arr.length;
    return <div className="progress bg-secondary-subtle" style={{"height": "5px"}}>
        {(arr || []).map((it, ind) => {
            if ((_perc + 1 >= it * onePerc) || (_perc && (it == 1))) {
                return <div style={{width: onePerc + '%', height: '5px'}}>
                    <div className="progress-bar bg-primary rounded-pill" role="progressbar"
                         style={{ width: 'calc(100% - 2px)', height: '5px'}} aria-valuenow="15"
                         aria-valuemin="0"
                         aria-valuemax="100"></div>
                </div>
            }
            return (<div key={ind}>
            </div>)
        })}
    </div>
}

function Layout2(props) {
    let [courses, setCourses] = useState([]);
    let [history, setHistory] = useState({});
    let [loading, setLoading] = useState(true);
    let topics = [{
        title: t('topic10'),
        desc: t('topic11'),
    }, {
        title: t('topic20'),
        desc: t('topic21'),
    }, {
        title: t('topic30'),
        desc: t('topic31'),
        // title: 'Важное о кодинге',
        // desc: `Самое важное в программировании — это решение проблем, а не сам код.`,
    }]
    let [activeInd, setActiveInd] = useState(Math.round(Math.random() * topics.length))
    console.log("*........ ## ROOT RENDER", props);

    function getCoursePerc(course, history) {
        let hist = (history || {})[course._id];
        let {qHistory = {}, mHistory = {}} = hist || {};
        let total = 0;
        let goodCount = 0;
        console.log("qqqqq course333333333", hist);

        let activeInd = 0;
        let isBad = false;
        _.each(hist.modules, (item, ind) => {
            total++;
            if (((mHistory || {})[item.module] || {}).status === "ok") {
                goodCount++;
            }
            _.each(item.questions, (qId, ind) => {
                total++;

                if (!isBad && hist && (qHistory[qId] || {}).status === "ok") {
                    activeInd = ind + 1;
                    goodCount++;
                } else {
                    isBad = true;
                }
            });

            // let hist = history[item.module]
            // console.log("qqqqq hist", hist, item.module, history);
        });
        console.log("qqqqq goodCount", mHistory, hist, goodCount, total);
        return Math.round((100 * goodCount) / total);
    }

    useEffect(() => {
        global.http.get("/load-my-courses").then(({courses, userCourses}) => {
            setCourses(courses);
            setLoading(false)
            setHistory(userCourses.reduce((acc, it) => ({...acc, [it.course]: it}), {}));
        });
    }, []);
    // let v = useActionData();
    console.log("qqqqq courses", courses, history);
    let activeList = courses;
    // activeList = []

    let activeEl = topics[activeInd % topics?.length]
    return (<>
            <div className="card">
                <div className="card-body" style={{'background': '#ffd88e3b'}}>
                    <div className="row">
                        <div className="col">
                            <h6 className="mb-2 mt-1 fw-medium text-dark fs-18">{activeEl.title}</h6>
                            <p className="text-body fs-14 " style={{maxWidth: '500px'}} dangerouslySetInnerHTML={{__html: activeEl.desc}}></p>
                            {activeEl.footer && <p className="text-body fs-14 " style={{maxWidth: '500px'}} dangerouslySetInnerHTML={{__html: activeEl.footer}}></p>}
                            <button type="button" className="btn btn-warning btn-sm px-2"
                                    onClick={() => {setActiveInd(++activeInd)}}
                            >{t('nextTopic')}</button>
                        </div>
                        <div className="col-auto align-self-center">
                            <img src="/st/notification.gif" alt="" height="90"
                                 className="rounded"/>
                        </div>
                    </div>
                </div>
            </div>
            <div className="card-body mb-3">
                <h5 className="text-body m-0 d-inline-block">{t('activeCourses')}</h5>
                <span
                    className="text-pink bg-pink-subtle py-0 px-1 rounded fw-medium d-inline-block ms-1">{activeList.length}</span>
            </div>
            <div className="card">
                <div className="card-body animChild">
                    {loading && <>
                        <Skeleton count={2}></Skeleton>
                    </>}
                    {!loading && !activeList?.length && <div className='tc'>
                      <MyImg t={100} w={300} title={'nothingFound'}>404</MyImg>
                    </div>}
                    {(activeList || []).map((it, ind) => {
                        let perc = getCoursePerc(it, history);
                        let hist = (history || {})[it._id] || {};
                        perc = perc || 0;
                        console.log("qqqqq hist", hist);

                        let translateObj= {
                          // "Базовые знания": "Basic Knowledge",
                          // "Алгоритмика": "Algorithms",
                          // "Создание CV": "CV Creation",
                          // "Подготовка к интервью": "Interview Preparation",
                          // "React Тестирование": "React Testing",
                          // "Верстка": "Web Development",
                          // "Топ 100 возможных вопросов на интервью": "Top 100 Potential Interview Questions",
                          // "Лайвкодинг Реакт": "Live Coding React",
                          // "Рекрутер": "Recruiter",
                          // "Алгоритмика Миддл (и)": "Middle-Level Algorithms"
                        }
                        return (<div className="row" key={ind}>
                            <div className="col-md-10">


                                <Link
                                    to={"/courses/" + it._id} className="">
                                    <div className="d-flex align-items-center">
                                        {/*<div className="flex-shrink-0">*/}
                                        {/*    <CircularProgress2*/}
                                        {/*        zoom={2}*/}
                                        {/*        title={"Теория"} value={perc} size={40}></CircularProgress2>*/}
                                        {/*</div>*/}
                                        <div className="flex-grow-1 text-truncate" style={{width: '30%'}}>
                                            <h6 className="my-1 fw-medium text-dark fs-14">{translateObj[it.name] || it.name}
                                                <small className="text-muted ps-2">
                                                </small></h6>
                                            <p className="text-muted mb-0 text-wrap" style={{marginTop: '-5px', marginBottom: '10px'}}>
                                                <span>
                                                    <small>{t('moduleCount')}: {(hist.modules || []).length}</small>
                                                </span>

                                            </p>
                                        </div>
                                        <div className="flex-grow-1 ms-2 " style={{width: '30%'}}>
                                            <p className="text-muted mb-0 text-wrap">

                                                <span>
                                                                                                        <small>{t('eduPerc')}: {perc}%</small>

                                                </span>
                                                <div style={{maxWidth: '120px'}}>
                                                    <NewPerc perc={perc}></NewPerc>
                                                </div>
                                            </p>

                                        </div>
                                    </div>
                                </Link>
                            </div>

                            <div className="col-md-2 text-end align-self-center mt-sm-2 mt-lg-0">
                                <Link
                                    to={"/courses/" + it._id} type="button" className="btn btn-light btn-sm px-2">
                                    <i className="iconoir-double-check"></i>
                                    {t('continue')}</Link>
                            </div>
                            {activeList?.length != (ind + 1) && <div className="col-xs-12">
                                <hr style={{marginTop: '5px', marginBottom: '5px'}}/>
                            </div>}
                        </div>)
                    })}


                </div>
            </div>
            {/*<div className="card">*/}
            {/*    <div className="card-body pt-0">*/}
            {/*        <div className="card-header">*/}
            {/*            <div className="row align-items-center">*/}
            {/*                <div className="col">*/}
            {/*                    <h4 className="card-title">Курсы</h4>*/}
            {/*                </div>*/}
            {/*            </div>*/}
            {/*        </div>*/}
            {/*        <div className="table-responsive">*/}
            {/*            <table className="table table-striped mb-0">*/}
            {/*                /!*<thead className="table-light">*!/*/}
            {/*                /!*<tr>*!/*/}
            {/*                /!*    <th>Customer</th>*!/*/}
            {/*                /!*    <th>Email</th>*!/*/}
            {/*                /!*    <th>Contact No</th>*!/*/}
            {/*                /!*    <th className="text-end">Action</th>*!/*/}
            {/*                /!*</tr>*!/*/}
            {/*                /!*</thead>*!/*/}
            {/*                <tbody>*/}
            {/*                <tr>*/}
            {/*                    <td><img src="assets/images/users/avatar-3.jpg" alt=""*/}
            {/*                             className="rounded-circle thumb-md me-1 d-inline"/> Aaron Poulin*/}
            {/*                    </td>*/}
            {/*                    <td>Aaron@example.com</td>*/}
            {/*                    <td>+21 21547896</td>*/}
            {/*                    <td className="text-end">*/}
            {/*                        <a href="#"><i className="las la-pen text-secondary font-16"></i></a>*/}
            {/*                        <a href="#"><i className="las la-trash-alt text-secondary font-16"></i></a>*/}
            {/*                    </td>*/}
            {/*                </tr>*/}
            {/*                <tr>*/}
            {/*                    <td><img src="assets/images/users/avatar-4.jpg" alt=""*/}
            {/*                             className="rounded-circle thumb-md me-1 d-inline"/> Richard Ali*/}
            {/*                    </td>*/}
            {/*                    <td>Richard@example.com</td>*/}
            {/*                    <td>+41 21547896</td>*/}
            {/*                    <td className="text-end">*/}
            {/*                        <a href="#"><i className="las la-pen text-secondary font-16"></i></a>*/}
            {/*                        <a href="#"><i className="las la-trash-alt text-secondary font-16"></i></a>*/}
            {/*                    </td>*/}
            {/*                </tr>*/}
            {/*                <tr>*/}
            {/*                    <td><img src="assets/images/users/avatar-5.jpg" alt=""*/}
            {/*                             className="rounded-circle thumb-md me-1 d-inline"/> Juan Clark*/}
            {/*                    </td>*/}
            {/*                    <td>Juan@example.com</td>*/}
            {/*                    <td>+65 21547896</td>*/}
            {/*                    <td className="text-end">*/}
            {/*                        <a href="#"><i className="las la-pen text-secondary font-16"></i></a>*/}
            {/*                        <a href="#"><i className="las la-trash-alt text-secondary font-16"></i></a>*/}
            {/*                    </td>*/}
            {/*                </tr>*/}
            {/*                <tr>*/}
            {/*                    <td><img src="assets/images/users/avatar-6.jpg" alt=""*/}
            {/*                             className="rounded-circle thumb-md me-1 d-inline"/> Albert Hull*/}
            {/*                    </td>*/}
            {/*                    <td>Albert@example.com</td>*/}
            {/*                    <td>+88 21547896</td>*/}
            {/*                    <td className="text-end">*/}
            {/*                        <a href="#"><i className="las la-pen text-secondary font-16"></i></a>*/}
            {/*                        <a href="#"><i className="las la-trash-alt text-secondary font-16"></i></a>*/}
            {/*                    </td>*/}
            {/*                </tr>*/}
            {/*                </tbody>*/}
            {/*            </table>*/}
            {/*        </div>*/}
            {/*    </div>*/}
            {/*</div>*/}
            {/*<div className={'card'}>*/}
            {/*    <div className={'card-body'}>*/}
            {/*        <div*/}
            {/*            className="afade coursePreview coursePreviewTitle"*/}
            {/*        >*/}
            {/*            <strong className="tabsTitle">*/}
            {/*                Список доступных курсов ({courses.length}):*/}
            {/*            </strong>*/}
            {/*        </div>*/}
            {/*        <div*/}

            {/*            data-courses={(courses || []).length}*/}
            {/*            className="animChild "*/}
            {/*            style={{*/}
            {/*                display: "block",*/}
            {/*                gap: "10px",*/}
            {/*                textAlign: "center",*/}
            {/*            }}*/}
            {/*        >*/}
            {/*            {(courses || []).map((it, ind) => {*/}
            {/*                let perc = getCoursePerc(it, history);*/}
            {/*                let hist = (history || {})[it._id] || {};*/}
            {/*                perc = perc || 0;*/}
            {/*                return (*/}
            {/*                    <Link*/}
            {/*                        to={"/courses/" + it._id}*/}
            {/*                        key={ind}*/}
            {/*                        className={"mainCont3 coursePreview"}*/}
            {/*                    >*/}
            {/*                        <div className="courseTitle">{it.name}</div>*/}
            {/*                        <div>*/}
            {/*                            <small>Кол-во модулей: {(hist.modules || []).length}</small>*/}
            {/*                        </div>*/}
            {/*                        <small>Процент изучения: {perc}%</small>*/}
            {/*                        <Perc top={15} value={perc}></Perc>*/}
            {/*                    </Link>*/}
            {/*                );*/}
            {/*            })}*/}
            {/*        </div>*/}
            {/*    </div>*/}
            {/*</div>*/}
        </>);
}

export default Layout2;

