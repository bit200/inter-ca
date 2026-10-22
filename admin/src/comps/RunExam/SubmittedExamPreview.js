import React, {useState} from 'react';
import IncorrectExamView from "./IncorrectExamView";
import RenderQuizResults from "../Suggest/RenderQuizResults";
import MDEditor from "@uiw/react-md-editor";
import LogsStarterPreview from "../Suggest/LogsStarterPreview";
import LazyEditor from "../LazyEditor/LazyEditor";
import MyImg from "../MyImg";
import {CheckErrorNotice} from "../Suggest/CheckErrorNotice";
import ExamTaskAiReview, {useExamAiReviews} from "./ExamTaskAiReview";

const SubmittedExamPreview = (props) => {
    const {dbTasks, submitDetails, jsObj, questionsDb, submitLoading, exam, history} = props

    window.onRenderLeftMenu && window.onRenderLeftMenu(null)

    const hasQuiz = (exam?.quizQuestionsPlain?.length ?? 0) > 0
    const hasTasks = dbTasks.length > 0

    const [selectedType, setSelectedType] = useState(hasQuiz ? 'quiz' : 'task')
    const [selectedQuizInd, setSelectedQuizInd] = useState(0)
    const [selectedTaskInd, setSelectedTaskInd] = useState(0)
    const aiReviews = useExamAiReviews(exam?._id)

    let selTask = dbTasks[selectedTaskInd] || {}
    let it = selTask
    let qId = it._id
    let hist = history[qId] || {}
    let logsReader = hist.logsReader || ''
    let jsDetails = jsObj[qId] || {}
    let files = Object.keys(hist.files || {}) || ['']
    let isLogsReader = jsDetails.codeType == 'logreader'
    let aiReview = aiReviews.find(review => +review.question === +qId)

    // Сбой проверки (api: submitDetails[id].status === 'check_error'): задача без балла, не fail.
    const isCheckErr = (id) => (submitDetails[id] || {}).status === 'check_error'
    const noticeVariant = global.env?.isAdmin ? 'mentor' : 'candidate'
    const examCheckErrors = (exam?.scoreDetails?.checkErrors || []).length
        || dbTasks.filter(task => isCheckErr(task._id)).length
    let isIncorrect = !questionsDb.length && !dbTasks.length
    if (isIncorrect) {
        return <IncorrectExamView/>
    }

    return <>
        {noticeVariant === 'mentor' && examCheckErrors > 0 &&
            <div data-testid={'exam-check-error-banner'}>
                <div role="alert" style={{
                    padding: '10px 14px', margin: '0 0 10px', background: '#fff7e6', color: '#7a4b00',
                    borderLeft: '4px solid #f0a000', borderRadius: 0
                }}>
                    <b>{t('checkErrorTitle')}: {examCheckErrors}</b>
                    <div>{t('checkErrorExamMentor')}</div>
                </div>
            </div>}
        <div data-testid={'submitted-exam-preview'} className={'mainCont2 row ' + (submitLoading ? 'o4' : '')}>

            {/* Unified sidebar */}
            <div className="col-sm-3 sticky3">
                <div className="card">
                    <div className="card-body">

                        {hasQuiz && <>
                            <div className="menuGroupHeader"><b>{t('questions')}</b></div>
                            {(exam.quizQuestionsPlain || []).map((it, ind) => (
                                <div key={it._id + 'quiz'}
                                     data-testid={'submitted-question-nav-' + ind}
                                     className={'menuList ' + (selectedType === 'quiz' && selectedQuizInd === ind ? 'activeList' : '')}
                                     onClick={() => { setSelectedType('quiz'); setSelectedQuizInd(ind) }}>
                                    <strong>{t('question')} #{ind + 1}</strong>
                                </div>
                            ))}
                        </>}

                        {hasQuiz && hasTasks && <hr/>}

                        {hasTasks && <>
                            <div className="menuGroupHeader"><b>{t('tasks')}</b></div>
                            {(dbTasks || []).map((it, ind) => {
                                let qId = it._id
                                let perc = submitDetails[qId] ? submitDetails[qId].perc : -1
                                let checkErr = isCheckErr(qId)
                                return (
                                    <div key={ind + 'task'}
                                         className={'menuList ' + (selectedType === 'task' && selectedTaskInd === ind ? 'activeList' : '')}
                                         onClick={() => { setSelectedType('task'); setSelectedTaskInd(ind) }}>
                                        <b>{t('task')} #{ind + 1}</b>
                                        {checkErr && <div data-testid={'task-check-error-mark'}
                                                          style={{fontSize: 12, color: '#b36b00'}}
                                                          title={t('checkErrorTitle')}>
                                            <i className="iconoir-warning-triangle"></i> {t('checkErrorTitle')}
                                        </div>}
                                        {exam.submitDetails && !checkErr &&
                                            <div className={'taskProgress'} style={{maxWidth: '100px'}}>
                                                <div className={"taskProgressValue " + (perc < 30 ? 'error' : perc < 70 ? 'norm' : 'good')}
                                                     style={{width: (perc + '%')}}></div>
                                            </div>}
                                    </div>
                                )
                            })}
                        </>}

                    </div>
                </div>
            </div>

            {/* Single content area */}
            <div className="col-sm-9 sticky3">

                {selectedType === 'quiz' && (
                    <RenderQuizResults
                        hideNav
                        exam={exam}
                        history={history}
                        selectedIndex={selectedQuizInd}
                        setSelectedIndex={setSelectedQuizInd}
                    />
                )}

                {selectedType === 'task' && (
                    <div className="card">
                        <div className="card-body">
                            <div className="row">
                                <div className="col-sm-6">
                                    {isCheckErr(qId) && <CheckErrorNotice variant={noticeVariant}/>}
                                    <MDEditor.Markdown source={it.name}></MDEditor.Markdown>
                                    {isLogsReader && <div>
                                        <LogsStarterPreview _id={it._id}></LogsStarterPreview>
                                    </div>}
                                    <ExamTaskAiReview review={aiReview}/>
                                </div>
                                <div className="col-sm-6">
                                    {isLogsReader && <div style={{height: '500px'}}>
                                        <small>{'Ответ'}</small>
                                        <LazyEditor
                                            options={{domReadOnly: true}}
                                            language={'javascript'}
                                            value={logsReader}
                                            height={'500px'}></LazyEditor>
                                    </div>}
                                    {!isLogsReader && (files || []).map((fileName, ind) => {
                                        let code = (hist.files || {})[fileName] || ''
                                        return (<div key={ind + 'file'} className={'rel'} style={{height: '500px'}}>
                                            <small>{fileName || 'index.js'}</small>
                                            <LazyEditor
                                                options={{domReadOnly: true}}
                                                language={'javascript'}
                                                value={code}
                                                height={'300px'}></LazyEditor>
                                        </div>)
                                    })}
                                    {!isLogsReader && !(files || [])?.length && <div className={'tc'}>
                                        <MyImg w={200}>404</MyImg>
                                        <div style={{marginTop: '20px'}}>{t('taskNotStarted')}</div>
                                    </div>}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    </>
};

export default SubmittedExamPreview;