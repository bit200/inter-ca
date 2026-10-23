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
const VERDICTS = {
    pass: 'aiReviewTestsPassed',
    fail: 'aiReviewTestsFailed',
    needs_review: 'aiReviewNoTests',
};
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

// onStart - необязательный запуск оценки по кнопке (когда баллов ещё нет).
export default function ExamTaskAiReview({review, onStart}) {
    if (!review) return null;
    let result = review.result || {};
    let tests = result.tests || {};

    return <div className="examAiReview" data-testid="exam-ai-review">
        <div className="examAiReview-title">
            <i className="iconoir-brain"></i> {t('aiReviewTitle')}
        </div>
        {BUSY.includes(review.status) && <div className="examAiReview-hint">{t('aiReviewPending')}</div>}
        {review.status === 'error' && <div className="examAiReview-hint">{t(ERRORS[review.errorCode] || 'aiReviewFailed')}</div>}
        {review.status === 'done' && <>
            <div className="examAiReview-verdict" data-verdict={result.verdict}>
                {t(VERDICTS[result.verdict] || 'aiReviewNoTests')}
                {tests.total ? ` (${tests.passed} / ${tests.total})` : ''}
            </div>
            <div className="examAiReview-scores">
                {CRITERIA.map(({key, name}) => {
                    let score = (result.scores || {})[key];
                    return <div className="examAiReview-score" key={key}>
                        <div className="examAiReview-scoreName">{t(name)}</div>
                        <div className="examAiReview-scoreValue">{score === null || score === undefined ? '—' : score}<small>/10</small></div>
                        <div className="examAiReview-reason">{(result.reasons || {})[key]}</div>
                    </div>
                })}
            </div>
            <div className="examAiReview-summary">{result.summary}</div>
        </>}
        {onStart && !BUSY.includes(review.status) && !hasAiScores(review) &&
            <button type="button" className="btn btn-primary examAiReview-start" data-testid="exam-ai-review-start" onClick={onStart}>
                <i className="iconoir-brain"></i> {t('aiReviewStart')}
            </button>}
    </div>
}
