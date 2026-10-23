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
