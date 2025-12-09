import React, {useEffect, useState} from 'react';
import _ from 'underscore';
import './PreviewCourseModule.css'
import QuestionDetails from "./QuestionDetails";
import MdPreview from "./MdPreview";
import MDEditor from "@uiw/react-md-editor";
import Button from "../../libs/Button";
import QuizTraining from "./QuizTraining";
import RunQuiz from "./RunQuiz";
import MyModal from "../../libs/MyModal";
import {Link} from "react-router-dom";
import {generateSuggestion} from "./SuggestionItem";
import CustomStorage from "./CustomStorage";
import CourseQuiz from "./CourseQuiz";
import {StarRating} from "../StarRating";
import {Videos} from "../Suggest/QuestionDetails"
import Train from "../TrainMethods/Train";
import {EmptyModule} from "./CourseDetails";
import './md.scss'
import Skeleton from "../../libs/Skeleton";

function PreviewCourseModule(props) {
    let {
        onOpenNextModule,
        qHistory,
        mHistory,
        isLastModule,
        courseUserId,
        onChangeQHistory,
        onChangeMHistory,
        questions,
        dbQuestionsObj,
        moduleId,
    } = props;
    let isAdmin = global.env.isAdmin || props.isAdmin;

    let [selectedBlockInd2, setSelectedBlockInd] = useState(0);
    let selectedBlockInd = props.selectedBlockInd;
    questions = questions || [];
    let selectedBlock = props.selectedBlock || questions[selectedBlockInd];
    let loading = props.loading;
    useEffect(() => {
        setSelectedBlockInd(props.selectedBlockInd)
        //console.log("set Selected Block ind")
    }, [props.selectedBlockInd])
    // useEffect(() => {
    // }, [selectedBlockInd])

    function _onOpenNextModule() {
        let activeQInd = getActiveQId();
        if (activeQInd === questions.length - 1) {
            onOpenNextModule && onOpenNextModule()
        } else {
            setSelectedBlockInd(activeQInd)
        }

    }

    useEffect(() => {
        selectedBlockInd !== -4 && onAction('change_selection', selectedBlock)
    }, [selectedBlock])


    useEffect(() => {
        let activeInd = getActiveQId()
        selectedBlockInd !== activeInd && setSelectedBlockInd(activeInd > questions.length - 1 ? -1 : activeInd)
    }, [questions])


    function scrollToView(selector = '#topicsList') {

        try {

            document.querySelector(selector).scrollIntoView({
                behavior: 'smooth', // Add smooth scrolling behavior
                block: 'start',     // Align the top of the element with the top of the container
            });
        } catch (e) {

            //console.log("qqqqq scroll to view bug", e);
        }

    }

    // window.scrollToView = scrollToView;

    function openInNewTab(url) {
        window.open(url, '').focus();
    }


    function onAction(type, data) {
        //console.log("on ACtion !!!!! ", type, data)
    }


    function onSelectInd(ind) {
        setSelectedBlockInd(-4);
        setTimeout(() => {
            setSelectedBlockInd(ind)
        }, 10)
    }

    function isActiveOk(ind) {
        if (isAdmin) {
            return true;
        }
        if (ind == -1) {
            return activeQInd >= questions.length - 1 && (qHistory[(questions[questions.length - 1] || {})._id || '_id_not_found'] || {}).status == 'ok';
        }
        return (activeQInd) >= ind;
    }

    function getActiveQId() {
        let activeQInd = 0;
        let isBad;

        _.each(questions || [], ({_id}, ind) => {
            let status = ((qHistory || {})[_id] || {}).status;
            if (status !== 'ok') {
                isBad = true;
            }
            if (!isBad) {
                activeQInd = ind + 1;
            }
        })
        return activeQInd
    }

    qHistory ??= {};
    let activeQInd = getActiveQId();
    let it = selectedBlock;
    let qId = (selectedBlock || {})._id;
    let isOk = props.isActive ? props.isActive.status : isActiveOk(selectedBlockInd)


    function isSimpleName(block) {
        block = block || {}
        return /js-task/gi.test(block.type) || (((block || {}).name || '').split('\n').length > 1) ? false : true;
    }


    if (loading) {
        return <></>
    }

    let delay = 0;

    function getDelay() {
        delay = delay + 50;
        return 0;//delay + 'ms'
    }


    return <div>
        {!isOk && <div className="cmMainBlocks">
            <EmptyModule></EmptyModule>
        </div>}
        {isOk && <div className="cmMainBlocks">
            {selectedBlock && <div className='animChild'>
                <div className="card">
                    <div className="card-body">
                        <QuestionDetailsNew item={selectedBlock}
                                            answerSubType={'course'}
                        ></QuestionDetailsNew>

                    </div>
                </div>
                <div className="card">
                    <div className="card-body">
                        <div className={'afade'}>

                            {<>
                                <div className="ib animChild">
                                    <CourseQuiz
                                        onAction={onAction}
                                        title={t('checkKnowledge')}
                                        questionId={selectedBlock._id}
                                        moduleId={moduleId}
                                        courseUserId={courseUserId}
                                        onSuccess={(r) => {
                                            let questionId = selectedBlock._id;
                                            onChangeQHistory({...qHistory, [questionId]: r})
                                            scrollToView();

                                            //console.log("qqqqq question is submitted ON SUCCSSESS",);
                                        }}
                                    ></CourseQuiz>
                                </div>
                                <div className="pull-right">

                                <button className={'btn btn-sm btn-light'}
                                        onClick={() => {
                                            props.onChangeInd(-1)
                                            // onSelectInd(selectedBlockInd < 1 ? -1 : selectedBlockInd - 1)
                                            // scrollToView('#topicsList')
                                        }}
                                >
                                    <i className="iconoir-nav-arrow-left pull-left"  style={{marginTop: '2px'}}></i>
                                    {/*<i className="iconoir-dot-arrow-left"></i>*/}
                                    {t('prevChapter')}
                                </button>
                                    <button className={'btn btn-sm btn-primary'}
                                            onClick={() => {
                                                props.onChangeInd(1)
                                                // onSelectInd(selectedBlockInd == questions.length - 1 ? -1 : selectedBlockInd + 1)
                                                // scrollToView('#topicsList')
                                            }}
                                    >
                                        {/*Следующая глава*/}
                                        {t('nextChapter')}
                                        <i className="iconoir-nav-arrow-right pull-right" style={{marginTop: '2px'}}></i>
                                        {/*<i className="iconoir-redo-action"></i>*/}
                                    </button>
                                </div>
                                <hr/>

                            </>}


                            <div className="w100 animChild">
                                {/* <div className="ib" > */}
                                <StarRating question={selectedBlock}></StarRating>
                                {/* </div> */}
                                {/* <div className="ib" style={{ position: 'relative', marginLeft: '20px', zIndex: '200' }}>
                            <a  onClick={() => {
                                generateSuggestion(selectedBlock._id)
                            }}>
                                <i className="fa fa-pencil" style={{marginRight: '10px' }}></i>
                                Улучшить ответ
                            </a>
                        </div> */}
                            </div>

                            {/*<hr/>*/}
                            {/*<div className="w100 tc">*/}


                            {/*</div>*/}
                        </div>
                    </div>
                </div>

            </div>}

            {selectedBlockInd === -1 && <div className="card animChild" id={'examStart'}>
                <div className="card-body">
                    <h2 className={''}>{t('doubleRepeatInforamtion')}</h2>

                    <hr/>
                    <div style={{padding: '10px 0 30px 0'}}>{isLastModule ? t('successCourse') : t('successModule')}!
                    </div>
                    <div className="w100">
                        <CourseQuiz
                            onAction={onAction}
                            title={t('checkKnowledge')}
                            moduleId={moduleId}
                            isLastModule={isLastModule}
                            courseUserId={courseUserId}
                            onSuccess={(r, cb) => {
                                onChangeMHistory({[moduleId]: r}, cb)
                                scrollToView();
                            }}
                        ></CourseQuiz>
                    </div>
                </div>
            </div>}
        </div>}
    </div>
}


export function QuestionDetailsNew(props) {

    let [loading, setLoading] = useState(false)
    let [httpItem, setHttpItem] = useState({})
    let {questionId, answerSubType} = props;
    let it = props.item || httpItem;
    let selectedBlock = it;

    function isSimpleName(block) {
        block = block || {}
        return /js-task/gi.test(block.type) || (((block || {}).name || '').split('\n').length > 1) ? false : true;
    }

    useEffect(() => {
        if (questionId) {
            setLoading(true)
            global.http
                .get("/load-question-from-exam", {question: questionId})
                .then(({question}) => {
                    setHttpItem(question || {});
                    setLoading(false)
                });
        }

    }, [questionId]);


    useEffect(() => {
        let hash = new Date().getTime();
        if (it && it._id) {
            //console.log("qqqqq it(((((((((", it, props, answerSubType);
            // global.http
            global.http.get('/question-history', {
                cd: new Date().getTime(),
                hash,
                answerSubType,
                status: 'start',
                question: it._id
            }).then()
        }
        return () => {
            it && it._id && global.http.get('/question-history-stop', {
                cd: new Date().getTime(),
                hash,
                answerSubType,
                status: 'stop',
                question: it?._id
            }).then()
            return true;
        }
    }, [it?._id])

    let delay = 0;

    function getDelay() {
        delay = delay + 50;
        return 0;//delay + 'ms'
    }


    if (loading) {
        return <Skeleton count={3}></Skeleton>
    }
    //console.log("qqqqq it4444444", it, props);

    if (!it._id) {
        return '-'
    }
    return <>
        <div className={'rel'}>
            {it.title && <h2 className={'cmTitle afade'} style={{animationDelay: getDelay()}}>
                {it.title}</h2>}

            {selectedBlock.type === 'js-task' && <>
                <a
                    className={'btn btn-sm2 btn-primary afade'} style={{margin: '10px 0', animationDelay: getDelay()}}
                    href={'/run?question=' + selectedBlock._id}
                    // onClick={() => {
                    //     openInNewTab('/run?question=' + selectedBlock._id)
                    // }}
                    target={"_blank"}>
                    {/*<i className="iconoir-code"></i>*/}
                    <i className="iconoir-codepen"></i>
                    {/*<i className="iconoir-laptop-dev-mode"></i>*/}
                    {/*<i className="iconoir-puzzle"></i>*/}
                    {/*<i className="iconoir-code-brackets-square"></i>*/}
                    {/*<i className="iconoir-developer"></i>*/}
                    {t('runTaskInEditor')}</a>
                <hr/>
            </>}
            {isSimpleName(selectedBlock) ? <h2 className={'cmTitle afade'} style={{
                    animationDelay: getDelay(),
                    marginBottom: '10px'
                }}>{selectedBlock.name}</h2> :
                <MDEditor.Markdown
                    source={selectedBlock.name}></MDEditor.Markdown>}
            <Videos items={selectedBlock.videos}/>
            {selectedBlock.answer && <MDEditor.Markdown source={selectedBlock.answer}/>}
            {selectedBlock.useCases && <div className=''>
                {(selectedBlock.useCases || []).map((it, ind) => {
                    return (<div key={ind} className='animChild'>
                        <h3 className={'h3Title'}>{it.name}</h3>
                        {it.desc && <MDEditor.Markdown source={it.desc}/>}
                    </div>)
                })}
            </div>}
            {selectedBlock.facts && <div>
                {(selectedBlock.facts || []).map((it, ind) => {
                    return (<div key={ind} className='animChild'>
                        <h3 className={'h3Title'}>{it.name}</h3>

                        {it.desc && <MDEditor.Markdown source={it.desc}/>}
                    </div>)
                })}
            </div>}</div>
    </>
}

// function Videos(props) {
//   let {items} = props;
//   if(!items || !items.length) {
//     return <></>
//   }
//  //console.log("vidoesssss", items)

//   return <div>
//     {items.map((it, ind) => {
//       return <div key={ind}>
//         {it.name}
//         {it.href}
//       </div>
//     })}
//   </div>
// }

export default PreviewCourseModule
