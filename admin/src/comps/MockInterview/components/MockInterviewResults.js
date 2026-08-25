import React, { useEffect, useState } from 'react';
import styles from '../mockInterview.module.scss';
import MockInterviewQuestionList from './MockInterviewQuestionList';
import MockInterviewTurnDetail from './MockInterviewTurnDetail';
import { groupAdvice } from '../../EvaluationDetail/components/adviceLogic';
import { getQuestionEvaluateStatus, jobsByQuestion, countFailedQuestions, resolveQuestionEvaluate } from './evaluateJobState';

// One dialog answer's advice, computed with the exact same rule-matching logic
// as AdviceSection (see adviceLogic.js) - just re-targeted at that single
// turn's own scoring instead of the whole-dialog aggregate. `evaladvicerules`
// keys are written relative to the whole answer object (`evaluation.depth.depth_score`,
// ...), so matchedScoredTurn (shape {depth, relevance, errors, practice, fillers, style})
// is wrapped as { evaluation: matchedScoredTurn } before matching - existing
// rule keys then just work, no path rewriting needed.
function computeTurnAdvice(matchedScoredTurn, rules, schemas) {
    const groups = groupAdvice(rules, schemas, { evaluation: matchedScoredTurn });
    const advice = Object.values(groups).flat().map(rule => rule.advice);
    const criticalErrors = matchedScoredTurn.errors?.is_critical
        ? (matchedScoredTurn.errors.errors || [])
        : [];
    return [...criticalErrors, ...advice];
}

// Attaches `advice` (flat string[]) to every dialog entry, matched to its
// per-turn scoring by turn_id (not array position - meta-turns like "Начнём."
// are filtered out before scoring, so `scoredTurns` can be shorter than
// `dialog`). Entries with no match (meta-turns, or scoring not done yet)
// get advice: [] - MockInterviewDialogChat's badge just doesn't render for those.
function withDialogAdvice(dialog, scoredTurns, rules, schemas) {
    if (!Array.isArray(dialog)) return dialog;
    return dialog.map(entry => {
        const matchedScoredTurn = (scoredTurns || []).find(t => t.turn_id === entry.turn_id);
        return {
            ...entry,
            advice: matchedScoredTurn ? computeTurnAdvice(matchedScoredTurn, rules, schemas) : [],
        };
    });
}

const MockInterviewResults = ({ interview, onRefresh }) => {
    const rawTurns = interview.turns || [];
    const evaluateByQuestion = {};
    (interview.evaluate || []).forEach(e => {
        evaluateByQuestion[e.questionId] = e.evaluate;
    });
    const jobs = jobsByQuestion(interview.evaluateState);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [retryingQuestion, setRetryingQuestion] = useState(null);
    const [adviceRules, setAdviceRules] = useState([]);
    const [metricSchemas, setMetricSchemas] = useState([]);

    const turns = rawTurns.map(turn => {
        const job = jobs[turn.question_id];
        const evaluate = resolveQuestionEvaluate(evaluateByQuestion[turn.question_id], job);
        return {
            ...turn,
            evaluate,
            evaluateStatus: getQuestionEvaluateStatus(evaluate, job),
            evaluateId: job?.evaluateId ?? null,
            evaluateExplain: job?.explain ?? null,
            dialog: turn.dialog
                ? withDialogAdvice(turn.dialog, evaluate?.turns, adviceRules, metricSchemas)
                : turn.dialog,
        };
    });

    // Точечный перезапуск оценки одного вопроса: остальные вопросы уже оценены,
    // гонять всю пачку заново незачем. Ответ пользователя на бэкенде сохранён,
    // перезапуск переоценивает именно его.
    const retryQuestion = (questionId) => {
        setRetryingQuestion(questionId);
        return global.http.post(`/mock-interview/${interview._id}/evaluate-retry`, { questionId }, { wo_notify: true })
            .then(() => {
                global.notify.success('Оценка запущена. Результат появится через минуту.');
                onRefresh && onRefresh();
            })
            .catch(() => {
                global.notify.warning('Оценка снова не запустилась. Попробуйте позже.');
            })
            .finally(() => setRetryingQuestion(null));
    };

    useEffect(() => {
        global.http.get('/eval-advice-rule', { per_page: 200 }).then(r => setAdviceRules(r.items || []));
        global.http.get('/eval-metric-schemas').then(r => setMetricSchemas(r.items || []));
    }, []);

    if (!turns.length) {
        return (
            <div className="card">
                <div className={`card-body ${styles.cardBody}`}>
                    <p className={styles.cardName}>{interview.name}</p>
                    <div className={styles.noInfo}>Результаты пока недоступны</div>
                </div>
            </div>
        );
    }

    return (
        <div className={`mainCont2 row`}>
            <div className="col-sm-3 sticky3">
                <MockInterviewQuestionList
                    turns={turns}
                    failedCount={countFailedQuestions(turns)}
                    selectedIndex={selectedIndex}
                    onSelect={setSelectedIndex}
                />
            </div>
            <div className="col-sm-9 sticky3">
                <MockInterviewTurnDetail
                    turn={turns[selectedIndex]}
                    adviceRules={adviceRules}
                    metricSchemas={metricSchemas}
                    interviewId={interview._id}
                    onRetryEvaluate={retryQuestion}
                    retrying={retryingQuestion === turns[selectedIndex]?.question_id}
                />
            </div>
        </div>
    );
};

export default MockInterviewResults;
