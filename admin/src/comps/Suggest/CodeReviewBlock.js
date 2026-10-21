import React, {useEffect, useState} from 'react';
import sse from 'libs/sse/sse';
import './codeReview.scss';

// «Разбор решения» после сдачи js/sql-задачи: aiReview из /code-submission/:id и SSE
// codeReview:<submissionId> (itk-platform-api, #4096). Кандидату API отдаёт только
// verdict, tests, scores, hints; эталон и скрытые кейсы сюда не попадают.
// Пока проверка pending/processing — ждём по SSE, без поллинга. Ошибку проверки
// не показываем (как evaluate в QuizHistory) — блок просто скрыт.
const CRITERIA = [
    ['correctness', 'Корректность'],
    ['optimality', 'Оптимальность'],
    ['readability', 'Читаемость'],
    ['process', 'Процесс'],
];

export function isReviewWaiting(aiReview) {
    return !aiReview || aiReview.status === 'pending' || aiReview.status === 'processing';
}

export function useCodeReview(submissionId) {
    let [aiReview, setAiReview] = useState(null);

    useEffect(() => {
        setAiReview(null);
        if (!submissionId) return;
        let closed = false;
        let unsubscribe = null;
        const apply = (review) => {
            if (closed || !review) return;
            setAiReview(review);
            if (!isReviewWaiting(review) && unsubscribe) {
                unsubscribe();
                unsubscribe = null;
            }
        };
        // Сначала снимок (проверка могла завершиться до подписки), затем SSE до done/error.
        global.http.get('/code-submission/' + submissionId).then(
            (s) => {
                if (closed) return;
                apply(s && s.aiReview);
                if (isReviewWaiting(s && s.aiReview)) {
                    unsubscribe = sse.subscribe('/code-review-events/' + submissionId, apply);
                }
            },
            () => {}
        );
        return () => {
            closed = true;
            unsubscribe && unsubscribe();
        };
    }, [submissionId]);

    return aiReview;
}

function scoreLevel(score) {
    return score >= 7 ? 'high' : score >= 4 ? 'mid' : 'low';
}

export function CodeReviewDone({result}) {
    let {verdict, tests, summary, hints = [], scores = {}, reasons = {}, needsHumanReview} = result || {};
    let isPass = verdict === 'pass';
    return <div className={'codeReviewDone'}>
        <div className={'codeReviewVerdict'} data-verdict={isPass ? 'pass' : 'fail'}>
            <span className={'codeReviewDot'}/>
            <span>{isPass ? 'Все тесты пройдены' : 'Тесты не пройдены'}</span>
            {tests && tests.total != null && <small>{tests.passed || 0} из {tests.total}</small>}
        </div>
        {needsHumanReview && <div className={'codeReviewHuman'}>Решение передано ментору</div>}
        {summary && <p className={'codeReviewSummary'}>{summary}</p>}
        {!!hints.length && <div>
            <div className={'codeReviewTitle'}>Что улучшить</div>
            <ul className={'codeReviewHints'}>
                {hints.map((h, i) => <li key={i}>{h}</li>)}
            </ul>
        </div>}
        <div className={'codeReviewScores'}>
            {CRITERIA.filter(([key]) => scores[key] != null).map(([key, label]) =>
                <div key={key} className={'codeReviewScore'} data-level={scoreLevel(scores[key])}>
                    <div className={'codeReviewScoreHead'}>
                        <span>{label}</span><b>{scores[key]}<small>/10</small></b>
                    </div>
                    <div className={'codeReviewBar'}><i style={{width: Math.max(0, Math.min(10, scores[key])) * 10 + '%'}}/></div>
                    {reasons[key] && <small>{reasons[key]}</small>}
                </div>)}
        </div>
    </div>
}

// isExam: в экзамене разбор не показываем (подгонка под модель, подсказки) — только факт отправки.
// hidden: режим квизов (проверка знаний курса) — плашки разбора нет вовсе, запросов тоже.
export function CodeReviewBlock({submissionId, isExam, hidden}) {
    let aiReview = useCodeReview(isExam || hidden ? null : submissionId);
    if (!submissionId || hidden) return null;
    if (isExam) {
        return <div className={'codeReview'} data-testid={'code-review'} data-state={'exam'}>
            <div className={'codeReviewWait'}>Решение отправлено</div>
        </div>
    }
    if (aiReview && aiReview.status === 'error') return null;
    return <div className={'codeReview'} data-testid={'code-review'}
                data-state={isReviewWaiting(aiReview) ? 'waiting' : 'done'}>
        <h5>Разбор решения</h5>
        {isReviewWaiting(aiReview)
            ? <div className={'codeReviewWait'}><span className={'codeReviewSpin'}/>ИИ проверяет решение…</div>
            : <CodeReviewDone result={aiReview.result}/>}
    </div>
}
