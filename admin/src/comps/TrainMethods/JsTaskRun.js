import React, {useState} from 'react';
import CodeRun from "../Suggest/CodeRun";
import {isSqlDetails} from "../Suggest/SqlRunResults";
import '../VsTask/VsTaskRun.css';
import './JsTaskRun.css';

// js-task (в т.ч. SQL, codeType 'sql') в проверке знаний курса: элемент js_<id> из
// /load-quizes-by-module ({_id, name, hints, jsDetails, moduleInfo}). Решается в CodeRun,
// засчитывается по сабмиту (/run-question с isSubmit): все тесты прошли — isCorrect.
// courseModule уходит в /run-question — сервер пускает только вопросы модуля из курса кандидата.
export function isJsTaskPassed(runResults) {
    return !!runResults && runResults.totalCount > 0 && !runResults.wrongCount;
}

function JsTaskRun(props) {
    let {task, onResult, onNext} = props;
    let [submitResults, setSubmitResults] = useState(null);
    let jsDetails = task.jsDetails || {};
    let isSql = isSqlDetails(jsDetails);
    let isPassed = isJsTaskPassed(submitResults);

    function saveCode(code, file, testCase) {
        global.http.post('/save-solution', {fnName: jsDetails.fnName, question: task._id, file, testCase, code})
    }

    return <div className={'vs-task js-task' + (isSql ? ' vs-task-sql' : '')} data-testid={'js-task'}
                data-task-id={task._id}>
        <div className={'vs-task-head'}>
            <span className={'vs-task-kind'}>
                <i className={isSql ? 'iconoir-database' : 'iconoir-code'}></i>
                {isSql ? t('vsTaskSql') : t('jsTaskCode')}
            </span>
            {task.title && <h4 className={'vs-task-name'}>{task.title}</h4>}
            <p className={'vs-task-hint'}>{t('jsTaskHint')}</p>
        </div>

        <div className={'js-task-editor'}>
            <CodeRun
                question={task}
                jsDetails={jsDetails}
                history={{}}
                courseModule={task.moduleInfo?._id}
                woSolution={true}
                isExam={true}
                courseCheck={true}
                onChangeCode={saveCode}
                onSubmitResults={(r) => {
                    setSubmitResults(r);
                    onResult && onResult({isCorrect: isJsTaskPassed(r), runResults: r});
                }}
            />
        </div>

        <div className={'vs-task-actions'}>
            {submitResults && <span className={'vs-task-status js-task-result' + (isPassed ? ' ok' : ' err')}
                                    role={'status'} data-testid={'js-task-result'} data-ok={isPassed ? 'true' : 'false'}>
                <span className={'vs-task-dot'}/>
                {isPassed ? t('jsTaskPassed') : `${t('jsTaskFailed')}: ${submitResults.passCount || 0} / ${submitResults.totalCount || 0}`}
            </span>}
            {onNext && <button type={'button'}
                               data-testid={'js-task-next'}
                               className={'btn vs-task-next ' + (isPassed ? 'btn-primary' : 'btn-light')}
                               onClick={() => onNext()}>
                {t('next')}
                <i className={'iconoir-nav-arrow-right'}></i>
            </button>}
        </div>
    </div>
}

export default JsTaskRun;
