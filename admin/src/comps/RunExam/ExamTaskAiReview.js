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
function translateWithVars(key, vars) {
    return String(t(key)).replace(/\{(\w+)\}/g, (match, name) => vars[name] === undefined ? match : vars[name]);
}

// Таймлайн набора: ось от 0 до последнего события, прогоны - точки, внешние вставки - отметки.
export function buildTypingTimeline(typing) {
    let runs = (typing || {}).runs || [];
    let pastes = (typing || {}).pastes || [];

    let lastEventTime = Math.max(1, ...runs.map(run => run.time || 0), ...pastes.map(paste => paste.time || 0));
    let toPercentOfAxis = time => Math.min(100, Math.max(0, 100 * (time || 0) / lastEventTime));

    return {
        max: lastEventTime,

        runs: runs.map(run => ({
            left: toPercentOfAxis(run.time),
            ok: run.total > 0 && run.passed === run.total,
            title: translateWithVars('aiReviewTimelineRun', {time: run.time, passed: run.passed, total: run.total}),
        })),

        pastes: pastes.map(paste => ({
            left: toPercentOfAxis(paste.time),
            label: paste.replacedShare >= 0.5
                ? translateWithVars('aiReviewTimelineReplaced', {percent: Math.round(paste.replacedShare * 100)})
                : translateWithVars('aiReviewTimelinePaste', {added: paste.added}),
            title: translateWithVars('aiReviewTimelinePasteAt', {time: paste.time, added: paste.added}),
        })),
    };
}

function ProcessTimeline({typing}) {
    let timeline = buildTypingTimeline(typing);
    if (!timeline.runs.length && !timeline.pastes.length) return null;
    return <div className="examAiReview-timeline" data-testid="exam-ai-review-timeline">
        <div className="examAiReview-timelineTrack">
            {timeline.pastes.map((p, i) => <span className="examAiReview-timelinePaste" data-testid="exam-ai-review-timeline-paste"
                                           key={'p' + i} style={{left: p.left + '%'}} title={`${p.label} (${p.title})`}></span>)}
            {timeline.runs.map((r, i) => <span className={`examAiReview-timelineRun ${r.ok ? 'ok' : 'fail'}`} data-testid="exam-ai-review-timeline-run"
                                         key={'r' + i} style={{left: r.left + '%'}} title={r.title}></span>)}
        </div>
        <div className="examAiReview-timelineAxis"><span>0</span><span>{timeline.max} {t('aiReviewSecShort')}</span></div>
    </div>
}

// Сколько раз код целиком заменяли (вставка с replacedShare >= 0.5); минимум 1, раз режим уже replaced_after_tests.
function countWholeReplacements(pastes) {
    let replacedCount = pastes.filter(paste => paste.replacedShare >= 0.5).length;

    return replacedCount || 1;
}

// Доля вставленного кода в процентах или null, если доля набранного руками неизвестна.
function getPastedPercent(typedShare) {
    if (typedShare === null || typedShare === undefined) return null;

    return Math.round((1 - typedShare) * 100);
}

function findBiggestPaste(pastes) {
    return pastes.reduce((biggest, paste) => !biggest || paste.added > biggest.added ? paste : biggest, null);
}

function getPartialPasteText(typing, pastes) {
    let pastedPercent = getPastedPercent(typing.typedShare);
    let biggestPaste = findBiggestPaste(pastes);

    let text = translateWithVars('aiReviewProcessPartial', {percent: pastedPercent === null ? '?' : pastedPercent});
    if (!biggestPaste) return text;

    return text + ' ' + translateWithVars('aiReviewProcessBiggest', {added: biggestPaste.added, time: biggestPaste.time});
}

// Текст плашки по режиму; null - для режимов, где плашки нет.
function getProcessBadgeText(typing) {
    let pastes = typing.pastes || [];

    switch (typing.mode) {
        case 'none':
            return t('aiReviewProcessNone');
        case 'pasted_whole':
            return t('aiReviewProcessPastedWhole');
        case 'replaced_after_tests':
            return translateWithVars('aiReviewProcessReplaced', {count: countWholeReplacements(pastes)});
        case 'partial_paste':
            return getPartialPasteText(typing, pastes);
        default:
            return null;
    }
}

// Плашка под критерием «Процесс» по режиму оценки процесса (typing.mode).
export function ProcessBadge({typing}) {
    let mode = (typing || {}).mode;
    if (!mode || mode === 'own') return null;

    let text = getProcessBadgeText(typing);
    if (text === null) return null;

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
