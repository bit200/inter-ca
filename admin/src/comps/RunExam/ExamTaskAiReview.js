import React, {useEffect, useState} from 'react';
import './examTaskAiReview.scss';

// ИИ-проверка решения live-coding задачи на экране сданного экзамена.
// Бэкенд (itk-platform-en, services/codeReviewQueue) проверяет решения после сдачи:
// итог «пройдено / нет» - по автотестам, оценки и разбор - модель. Пока проверка идёт,
// блок опрашивает сервер.

const POLL_MS = 5000;
const BUSY = ['pending', 'processing'];
const CRITERIA = [
    {key: 'correctness', name: 'aiReviewCorrectness'},
    {key: 'optimality', name: 'aiReviewOptimality'},
    {key: 'readability', name: 'aiReviewReadability'},
    {key: 'process', name: 'aiReviewProcess'},
];
const ERRORS = {
    empty_code: 'aiReviewEmptyCode',
    input_too_large: 'aiReviewTooLarge',
};

export function useExamAiReviews(examId) {
    let [reviews, setReviews] = useState([]);

    function load() {
        return global.http.get('/my-exam-code-reviews', {examId})
            .then(r => setReviews((r || {}).reviews || []), () => {});
    }

    useEffect(() => {
        if (!examId) return;
        load();
    }, [examId]);

    let busy = reviews.some(it => BUSY.includes(it.status));
    useEffect(() => {
        if (!busy) return;
        let timer = setTimeout(load, POLL_MS);
        return () => clearTimeout(timer);
    }, [busy, reviews]);

    return reviews;
}

export function hasAiScores(review) {
    let scores = ((review || {}).result || {}).scores || {};
    return Object.values(scores).some(v => typeof v === 'number');
}

// Решение без кода (files пришли, но все пустые): баллы модели тут ничего не значат.
export function hasNoSolution(review) {
    let files = (review || {}).files;
    if (!files || typeof files !== 'object') return false;
    return !Object.values(files).some(code => typeof code === 'string' && code.trim());
}

// t() без подстановок: {name} заменяем сами.
function tf(key, vars) {
    return String(t(key)).replace(/\{(\w+)\}/g, (m, k) => vars[k] === undefined ? m : vars[k]);
}

// Таймлайн набора: ось от 0 до последнего события, прогоны - точки, внешние вставки - отметки.
export function buildTimeline(typing) {
    let runs = (typing || {}).runs || [];
    let pastes = (typing || {}).pastes || [];
    let max = Math.max(1, ...runs.map(r => r.time || 0), ...pastes.map(p => p.time || 0));
    let pos = time => Math.min(100, Math.max(0, 100 * (time || 0) / max));
    return {
        max,
        runs: runs.map(r => ({
            left: pos(r.time), ok: r.total > 0 && r.passed === r.total,
            title: tf('aiReviewTimelineRun', {time: r.time, passed: r.passed, total: r.total}),
        })),
        pastes: pastes.map(p => ({
            left: pos(p.time),
            label: p.replacedShare >= 0.5
                ? tf('aiReviewTimelineReplaced', {percent: Math.round(p.replacedShare * 100)})
                : tf('aiReviewTimelinePaste', {added: p.added}),
            title: tf('aiReviewTimelinePasteAt', {time: p.time, added: p.added}),
        })),
    };
}

function ProcessTimeline({typing}) {
    let tl = buildTimeline(typing);
    if (!tl.runs.length && !tl.pastes.length) return null;
    return <div className="examAiReview-timeline" data-testid="exam-ai-review-timeline">
        <div className="examAiReview-timelineTrack">
            {tl.pastes.map((p, i) => <span className="examAiReview-timelinePaste" data-testid="exam-ai-review-timeline-paste"
                                           key={'p' + i} style={{left: p.left + '%'}} title={`${p.label} (${p.title})`}></span>)}
            {tl.runs.map((r, i) => <span className={`examAiReview-timelineRun ${r.ok ? 'ok' : 'fail'}`} data-testid="exam-ai-review-timeline-run"
                                         key={'r' + i} style={{left: r.left + '%'}} title={r.title}></span>)}
        </div>
        <div className="examAiReview-timelineAxis"><span>0</span><span>{tl.max} {t('aiReviewSecShort')}</span></div>
    </div>
}

// Плашка под критерием «Процесс» по режиму оценки процесса (typing.mode).
export function ProcessBadge({typing}) {
    let mode = (typing || {}).mode;
    if (!mode || mode === 'own') return null;
    let pastes = typing.pastes || [];
    let text;
    if (mode === 'none') text = t('aiReviewProcessNone');
    else if (mode === 'pasted_whole') text = t('aiReviewProcessPastedWhole');
    else if (mode === 'replaced_after_tests') {
        let n = pastes.filter(p => p.replacedShare >= 0.5).length;
        text = tf('aiReviewProcessReplaced', {count: n || 1});
    } else if (mode === 'partial_paste') {
        let share = typing.typedShare === null || typing.typedShare === undefined ? null : Math.round((1 - typing.typedShare) * 100);
        let biggest = pastes.reduce((a, p) => !a || p.added > a.added ? p : a, null);
        text = tf('aiReviewProcessPartial', {percent: share === null ? '?' : share})
            + (biggest ? ' ' + tf('aiReviewProcessBiggest', {added: biggest.added, time: biggest.time}) : '');
    } else return null;
    return <div className={`examAiReview-badge is-${mode}`} data-testid="exam-ai-review-process-badge" data-mode={mode}>
        <span>{text}</span>
        {mode === 'pasted_whole' && <strong>{t('aiReviewProcessManual')}</strong>}
    </div>
}

// Критерии: вкладки «Все» + по критерию, у каждого балл, разбор и (если модель дала) рекомендация.
function ScoresList({result}) {
    let [active, setActive] = useState(null);
    let visible = active === null ? CRITERIA : CRITERIA.filter(c => c.key === active);
    return <>
        <ul className="nav nav-tabs examAiReview-tabs" role="tablist" data-testid="exam-ai-review-tabs">
            {[{key: null, label: t('aiReviewAll')}, ...CRITERIA.map(c => ({key: c.key, label: t(c.name)}))].map(tab =>
                <li className="nav-item" role="presentation" key={tab.key || 'all'}>
                    <button type="button" role="tab" aria-selected={active === tab.key}
                            className={`nav-link fw-medium ${active === tab.key ? 'active' : ''}`}
                            onClick={() => setActive(tab.key)}>{tab.label}</button>
                </li>)}
        </ul>
        <div className="examAiReview-scores">
            {visible.map(({key, name}) => {
                let score = (result.scores || {})[key];
                let suggestion = (result.suggestions || {})[key];
                return <div className="examAiReview-score" key={key}>
                    <div className="examAiReview-scoreHead">
                        {active === null && <span className="examAiReview-scoreName">{t(name)}</span>}
                        <span className="examAiReview-scoreValue">{score === null || score === undefined ? '—' : score}<small>/10</small></span>
                    </div>
                    <div className="examAiReview-reason">{(result.reasons || {})[key]}</div>
                    {key === 'process' && <div className="examAiReview-processNote" data-testid="exam-ai-review-process-note">
                        {t('aiReviewProcessNote')}
                    </div>}
                    {key === 'process' && <ProcessBadge typing={result.typing}/>}
                    {key === 'process' && <ProcessTimeline typing={result.typing}/>}
                    {suggestion && <div className="examAiReview-suggestion" data-testid="exam-ai-review-suggestion">
                        <i className="iconoir-light-bulb-on"></i>
                        <span>{suggestion}</span>
                    </div>}
                </div>
            })}
        </div>
    </>
}

// onStart - необязательный запуск оценки по кнопке (когда баллов ещё нет).
export default function ExamTaskAiReview({review, onStart}) {
    if (!review) return null;
    let result = review.result || {};
    let tests = result.tests || {};
    let noSolution = hasNoSolution(review);

    return <div className="examAiReview" data-testid="exam-ai-review">
        <div className="examAiReview-title">
            <i className="iconoir-brain"></i> {t('aiReviewTitle')}
        </div>
        {BUSY.includes(review.status) && <div className="examAiReview-hint">{t('aiReviewPending')}</div>}
        {review.status === 'error' && <div className="examAiReview-hint">{t(ERRORS[review.errorCode] || 'aiReviewFailed')}</div>}
        {review.status === 'done' && noSolution &&
            <div className="examAiReview-hint" data-testid="exam-ai-review-empty-code">{t('aiReviewEmptyCode')}</div>}
        {review.status === 'done' && !noSolution && <>
            <ScoresList result={result}/>
            <div className="examAiReview-summary">{result.summary}</div>
            <div className="examAiReview-note" data-testid="exam-ai-review-note">
                <i className="iconoir-sparks"></i>
                <span>{t('aiReviewNote')}</span>
            </div>
        </>}
        {onStart && !BUSY.includes(review.status) && !hasAiScores(review) &&
            <button type="button" className="btn btn-primary examAiReview-start" data-testid="exam-ai-review-start" onClick={onStart}>
                <i className="iconoir-brain"></i> {t('aiReviewStart')}
            </button>}
    </div>
}
