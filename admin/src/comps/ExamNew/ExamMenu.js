import MyImg from "../MyImg";
import React from "react";
import Button from "../../libs/Button";
import {getExamId} from "./GetExamId";
import {ExamCountDown} from "./ExamCountDown";
import {getExamTasks} from "./GetExamTasks";
import {getExamQuizes} from "./GetExamQuizes";

export function ExamMenu(props) {
    let {
        exam, canSubmit,
        quizHistory,
        warningModal, history,
        selectedInd,
        submitLoading, setSelectedInd, onSubmit
    } = props;

    let templateInfo = exam.templateInfo;

    let quizes = getExamQuizes(exam)
    let quizCount = _.size(quizes)
    let answerQuizCount = _.size(history?.quizes || []);
    let tasks = getExamTasks(exam)
    console.log("qqqqq exam menu", templateInfo, tasks);

    
    

    return <>
        <div className='examMenu'>


            <div className='examCount'>
                <h5 className={'tc'} style={{marginTop: '0px'}}>
                    <i className="iconoir-alarm" style={{marginRight: '5px', marginBottom: '-1px'}}></i>
                    <ExamCountDown
                        exam={exam}
                        warning={'00:05'}
                        onWarning={(time) => {
                            warningModal.current.show();
                        }
                        }
                        onEnd={() => {
                            //console.log("qqqqq onENd onEnd",);
                            onSubmit()
                        }
                        }
                    ></ExamCountDown>
                </h5></div>
            <hr/>
            <div className={'nav flex-column nav-pills text-center'} role="tablist" aria-orientation="vertical">
                {!!quizCount && <div
                    onClick={() => {
                        setSelectedInd(-1)
                    }}
                    className={'nav-link waves-effect waves-light  ' + (selectedInd == -1 ? 'active' : '')}>
                    {t('questions')}({quizCount})
                </div>}
                {(tasks || []).map((it, ind) => {
                    let qId = it._id;
                    // let perc = submitDetails[qId] ? submitDetails[qId].perc : -1;
                    return (<div key={ind}
                                 className={'nav-link waves-effect waves-light ' + (selectedInd == ind ? 'active' : '')}
                                 onClick={() => {
                                     if (selectedInd == -1) {
                                         console.log("qqqqq quiz history", exam.quizHistory);
                                         if (_.size(quizHistory) >= _.size(quizes)) {
                                             setSelectedInd(ind)
                                         } else {
                                             window?.onConfirm({
                                                 yes: t('Да'),
                                                 name: t('Текущий квиз и таймер - не будут остановлены! Уверены, что хотите сменить задачу?')
                                             }, () => {
                                                 setSelectedInd(ind)
                                             })
                                         }
                                     } else {
                                         setSelectedInd(ind)
                                     }

                                 }}>
                        {t('task')} #{ind + 1}
                        {/* {exam.submitDetails && <div className={'taskProgress'}>
                        <div className={"taskProgressValue " + (perc < 30 ? 'error' : perc < 70 ? 'norm' : 'good')}
                             style={{width: (perc + '%')}}></div>
                    </div>} */}
                    </div>)
                })}
            </div>
            <hr/>
            {canSubmit() && <Button forceDisabled={!canSubmit()}
                                    forceClassName={'btn btn-lg btn-default'}
                                    onClick={(scb, ecb) => {
                                        canSubmit() && global.http.get('/attempt-to-run', {_id: exam._id})
                                            .then(r => {
                                                //console.log("qqqqq rrrr", r);
                                                setExam(r)
                                                scb && scb();
                                            })
                                    }
                                    }>
                <div className={'btncheck0'}>{t('checkResult')}</div>
                <div className={'btncheck'}><small>{t("remainingAttemts")}
                    ({Math.max(SUBMIT_DEFAULT - exam.submitCount, 0)})</small></div>
            </Button>}
            <Button
                className={'w100 btn-secondary btn-sm'}

                color={4}
                forceDisabled={submitLoading}
                onClick={(scb) => {
                    //console.log("qqqqq click", );
                    onConfirm({
                        name: t('areYouSureToComplete')
                    }, () => {
                        onSubmit(scb)
                    })
                }}>
                <div className={'btncheck0'}>
                    {/*<i className="iconoir-edit"></i>*/}
                    {t('completeExam')}
                </div>
                {/*<div className={'btncheck'}><small>Отправить все задачи</small></div>*/}
            </Button>
        </div>
    </>
}

