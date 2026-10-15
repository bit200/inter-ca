import React, {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import './VsTaskRun.css';
import {
    getStartError,
    getVscodeLink,
    fixVscodeLink,
    isSqlTask,
    lastSessionStep,
    pickLng,
    pubTestInfo
} from "./vsTask";

// Единственная точка показа VS Code-задачи в клиенте (экзамен/тренировка): кнопка
// «Открыть задачу в редакторе» -> /pre-start-session -> /exec-start-session -> iframe
// на vscode_link, статус запуска с docker-m (/session_status) и сводка VsSession.test_info.
// Тот же флоу, что VsCodeWrapper в itk-platform-en/interviews/admin — не дублировать рядом.

const RESULT_POLL_MS = 15000;
const STATUS_POLL_MS = 1000;
const FINISH_ITEM = 'Завершить задачу';

function storageKey(examId, taskId) {
    return 'vs-session-' + (examId || 'train') + '-' + taskId;
}

function readSaved(key) {
    try {
        return JSON.parse(window.localStorage.getItem(key) || 'null') || {};
    } catch (e) {
        return {};
    }
}

function writeSaved(key, value) {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
    }
}

export function VsTestSummary({info, onRefresh, refreshing}) {
    let {hasResult, total, passed, failed, status} = info;
    let cells = hasResult && total <= 40 ? Array.from({length: total}, (_, i) => i < passed) : null;
    return <div className={'vs-task-result'} data-testid={'vs-task-result'} data-status={status}
                data-passed={passed} data-total={total}>
        <div className={'vs-task-result-head'}>
            <span className={'vs-task-result-title'}>{t('vsTaskResult')}</span>
            {onRefresh && <button type={'button'}
                                  data-testid={'vs-task-refresh'}
                                  className={'btn btn-xs btn-default'}
                                  disabled={refreshing}
                                  onClick={onRefresh}>
                <i className={'iconoir-refresh'}></i> {t('vsTaskRefreshResult')}
            </button>}
        </div>
        {!hasResult && <div className={'vs-task-result-empty'}>{t('vsTaskNoResult')}</div>}
        {hasResult && <>
            <div className={'vs-task-result-score'}>
                <b>{passed}</b><span className={'vs-task-result-total'}> / {total}</span>
                <span className={'vs-task-result-caption'}>{t('vsTaskPassedOf')}</span>
                <span className={'vs-task-result-verdict'}>
                    {status === 'ok' && !failed ? t('vsTaskAllPassed') : t('vsTaskHasFailed')}
                </span>
            </div>
            {cells
                ? <div className={'vs-task-cells'} aria-hidden={true}>
                    {cells.map((ok, i) => <span key={i} className={'vs-task-cell ' + (ok ? 'ok' : 'err')}/>)}
                </div>
                : <div className={'vs-task-bar'} aria-hidden={true}>
                    <span style={{width: (100 * passed / total) + '%'}}/>
                </div>}
        </>}
    </div>
}

function VsTaskRun(props) {
    // onNext — VS-задача внутри тренажёра (Train): без него из задачи некуда было
    // уйти, и проверка знаний с VS-задачей в конце не заканчивалась никогда.
    let {task, examId, hist, onSession, onNext, onResult} = props;
    let taskId = task?._id;
    let key = storageKey(examId, taskId);

    let [session, setSession] = useState(null);
    let [phase, setPhase] = useState('idle'); // idle | starting | ready | error
    let [link, setLink] = useState('');
    let [step, setStep] = useState('');
    let [error, setError] = useState('');
    let [testInfo, setTestInfo] = useState(null);
    let [refreshing, setRefreshing] = useState(false);
    let [full, setFull] = useState(true);
    let [submitting, setSubmitting] = useState(false);
    let [submitFailed, setSubmitFailed] = useState(false);
    let runId = useRef(0);
    let submitRef = useRef(null);

    let saved = {...readSaved(key), ...(hist?.session_id ? hist : {})};
    let sessionId = session?.session_id || saved.session_id || '';
    let isSql = isSqlTask(task, session);

    useEffect(() => {
        runId.current++;
        setSession(null);
        setPhase('idle');
        setLink('');
        setStep('');
        setError('');
        setTestInfo(null);
        setFull(true);
        setSubmitting(false);
        setSubmitFailed(false);
    }, [taskId]);

    // Пункт «Завершить задачу» внутри редактора = то же, что кнопка под ним.
    useEffect(() => {
        let onMessage = (event) => {
            let data = event?.data || {};
            if (data.type === 'treeitemClick' && data.elementText === FINISH_ITEM) {
                submitRef.current && submitRef.current();
            }
        };
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, []);

    useEffect(() => {
        sessionId && loadResult(sessionId);
    }, [sessionId]);

    // Пока редактор поднимается — показываем текущий шаг docker-m.
    useEffect(() => {
        if (phase !== 'starting' || !session?.server_http || !session?.session_id) {
            return;
        }
        let url = session.server_http + '/session_status?session_id=' + encodeURIComponent(session.session_id);
        let interval = setInterval(() => {
            fetch(url).then(r => r.json()).then(r => setStep(lastSessionStep(r))).catch(() => {
            });
        }, STATUS_POLL_MS);
        return () => clearInterval(interval);
    }, [phase, session?.session_id]);

    // Тесты гоняются внутри VS Code — пока редактор открыт, подтягиваем свежий результат.
    useEffect(() => {
        if (phase !== 'ready' || !sessionId) {
            return;
        }
        let interval = setInterval(() => loadResult(sessionId), RESULT_POLL_MS);
        return () => clearInterval(interval);
    }, [phase, sessionId]);

    function loadResult(session_id, scb) {
        setRefreshing(true);
        return global.http.get('/populated-session', {session_id}, {wo_notify: true})
            .then(r => {
                setTestInfo(pubTestInfo(r?.item?.test_info));
            })
            .catch(() => {
            })
            .finally(() => {
                setRefreshing(false);
                scb && scb();
            });
    }

    // «Завершить задачу»: сохраняем состояние редактора и гоняем полный набор тестов на docker-m
    // (как в админке), затем подтягиваем итог. Доступно, пока сессия есть, — и после сворачивания.
    async function submit() {
        let base = session?.server_http;
        if (!base || !sessionId || submitting) return;
        setSubmitting(true);
        setSubmitFailed(false);
        try {
            let q = '?session_id=' + encodeURIComponent(sessionId);
            await fetch(base + '/create_upload_session_patch' + q).then(r => r.json());
            await fetch(base + '/full_test_new_sse' + q).then(r => r.text());
            await loadResult(sessionId);
        } catch (e) {
            setSubmitFailed(true);
        }
        setSubmitting(false);
    }
    submitRef.current = submit;

    async function open(isRestart) {
        let myRun = ++runId.current;
        setPhase('starting');
        setError('');
        setStep('');
        setLink('');
        setFull(true);
        try {
            let lng = pickLng(task, saved);
            let pre = await global.http.get('/pre-start-session', {
                task_group_id: taskId,
                lng: lng || '-',
                type: 'client',
                exam_id: examId || '',
                existing_session_id: isRestart ? '' : (saved.session_id || '')
            }, {wo_notify: true});
            if (myRun !== runId.current) return;
            let sess = pre?.session || {};
            setSession(sess);
            let entry = {session_id: pre?.session_id || sess.session_id, lng: pre?.lng || lng};
            writeSaved(key, entry);
            onSession && onSession(entry);

            let started = await global.http.get('/exec-start-session', {session_id: entry.session_id}, {wo_notify: true});
            if (myRun !== runId.current) return;
            let vsLink = getVscodeLink(started);
            let err = getStartError(started);
            if (!vsLink || err) {
                setError(err);
                setPhase('error');
                return;
            }
            setLink(fixVscodeLink(vsLink, sess?.server_http));
            setPhase('ready');
        } catch (e) {
            if (myRun !== runId.current) return;
            setError(e?.err || e?.msg || e?.error || '');
            setPhase('error');
        }
    }

    let info = testInfo || pubTestInfo(null);
    // Тренажёр (Train) учитывает результат задачи в проценте сдачи проверки знаний.
    useEffect(() => {
        info.hasResult && onResult && onResult({isCorrect: info.status === 'ok', systemError: false, ...info});
    }, [info.hasResult, info.status, info.passed, info.total]);
    // Сбой запуска VS Code или отправки (docker-m, vstasks) — не вина ученика: сообщаем Train,
    // чтобы задача не снижала процент проверки знаний.
    let systemError = phase === 'error' || submitFailed;
    useEffect(() => {
        systemError && onResult && onResult({isCorrect: false, systemError: true});
    }, [systemError]);
    let starting = phase === 'starting';
    // В тренажёре решённая задача — повод идти дальше: основной становится «Далее».
    let isSolved = !!onNext && info.status === 'ok';

    const frameNode = <div className={'vs-task-frame' + (full ? ' vs-task-frame-full' : '')}>
            {full && <div className={'vs-task-frame-bar'}>
                <span className={'vs-task-frame-title'}>{task?.name}</span>
                {session?.server_http && <button type={'button'}
                                                 className={'btn btn-xs btn-success'}
                                                 disabled={submitting}
                                                 onClick={submit}>
                    {submitting ? t('vsTaskSubmitting') : t('vsTaskSubmit')}
                </button>}
                <button type={'button'} className={'btn btn-xs btn-default'} data-testid={'vs-task-collapse'}
                        onClick={() => setFull(false)}>
                    <i className={'iconoir-collapse'}></i> {t('vsTaskExitFullscreen')}
                </button>
            </div>}
            <iframe src={link} title={task?.name || 'VS Code'} allow={'clipboard-read; clipboard-write'}/>
        </div>;

    return <div className={'vs-task' + (isSql ? ' vs-task-sql' : '')} data-phase={phase}
                data-testid={'vs-task'} data-task-id={taskId}>
        <div className={'vs-task-head'}>
            <span className={'vs-task-kind'}>
                <i className={isSql ? 'iconoir-database' : 'iconoir-code'}></i>
                {isSql ? t('vsTaskSql') : t('vsTaskCode')}
            </span>
            <h4 className={'vs-task-name'}>{task?.name}</h4>
            <p className={'vs-task-hint'}>{isSql ? t('vsTaskSqlHint') : t('vsTaskCodeHint')}</p>
        </div>

        <div className={'vs-task-actions'}>
            <button type={'button'}
                    data-testid={'vs-task-open'}
                    className={'btn ' + (phase === 'ready' ? 'btn-default' : isSolved ? 'btn-light' : 'btn-primary')}
                    disabled={starting}
                    onClick={() => open(phase === 'ready' || phase === 'error')}>
                {phase === 'ready' || phase === 'error' ? t('vsTaskReopen') : saved.session_id ? t('vsTaskBack') : t('vsTaskOpen')}
            </button>
            {phase === 'ready' && session?.server_http && <button type={'button'}
                                                                  className={'btn btn-success'}
                                                                  disabled={submitting}
                                                                  onClick={submit}>
                {submitting ? t('vsTaskSubmitting') : t('vsTaskSubmit')}
            </button>}
            {starting && <span className={'vs-task-status'} role={'status'}>
                <span className={'vs-task-dot'}/>{t('vsTaskStarting')}
                {step && <span className={'vs-task-step'}>{step}</span>}
            </span>}
            {phase === 'ready' && <span className={'vs-task-status ok'} role={'status'}>
                <span className={'vs-task-dot'}/>{t('vsTaskReady')}
                <a href={link} target={'_blank'} rel={'noopener noreferrer'}>{t('vsTaskNewWindow')}</a>
                {!full && <button type={'button'} className={'btn btn-xs btn-default'} data-testid={'vs-task-expand'}
                                  onClick={() => setFull(true)}>
                    <i className={'iconoir-expand'}></i> {t('vsTaskFullscreen')}
                </button>}
            </span>}
            {onNext && <button type={'button'}
                               data-testid={'vs-task-next'}
                               className={'btn vs-task-next ' + (isSolved ? 'btn-primary' : 'btn-light')}
                               onClick={() => onNext()}>
                {t('next')}
                <i className={'iconoir-nav-arrow-right'}></i>
            </button>}
        </div>
        {submitFailed && <div className={'vs-task-error'} role={'alert'}>{t('vsTaskSubmitFailed')}</div>}
        {phase === 'error' && <div className={'vs-task-error'} role={'alert'}>
            {t('vsTaskStartFailed')}
            {error && <div className={'vs-task-error-details'}>{String(error)}</div>}
        </div>}

        {phase === 'ready' && (full ? createPortal(frameNode, document.body) : frameNode)}

        <VsTestSummary info={info}
                       refreshing={refreshing}
                       onRefresh={sessionId ? () => loadResult(sessionId) : null}/>
    </div>
}

export default VsTaskRun;
