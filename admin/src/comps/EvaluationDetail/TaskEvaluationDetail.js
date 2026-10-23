import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import styles from './evaluationDetail.module.scss';
import ExamTaskAiReview from '../RunExam/ExamTaskAiReview';
import { scoreVerdict } from './components/scoreVerdict';
import MentorReviewSection from './components/MentorReviewSection';
import MetricChip from './components/MetricChip';
import { formatScore } from './components/formatScore';

const CRITERIA = [
    { key: 'correctness', name: 'aiReviewCorrectness' },
    { key: 'optimality', name: 'aiReviewOptimality' },
    { key: 'readability', name: 'aiReviewReadability' },
];

// Страница разбора ИИ-проверки задачи модуля (без экзамена): /evaluations/task/:id.
// Оформление - то же, что у разбора ответа (/evaluations/:id): шапка-карточка с
// названием, описанием, чипами и вердиктом, под ней оценка куратора, затем блок
// метрик, и в конце решение с деталями разбора.
export default function TaskEvaluationDetail() {
    const { id } = useParams();
    const [review, setReview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [startError, setStartError] = useState('');

    const load = () => global.http.get('/my-code-reviews', {}, { wo_notify: true })
        .then(r => setReview((r.items || []).find(it => String(it._id) === String(id)) || null));

    useEffect(() => {
        setLoading(true);
        load().catch(() => setReview(null)).finally(() => setLoading(false));
    }, [id]);

    // пока оценка идёт, опрашиваем список
    const busy = review && (review.status === 'pending' || review.status === 'processing');
    useEffect(() => {
        if (!busy) return;
        const timer = setTimeout(() => load().catch(() => {}), 5000);
        return () => clearTimeout(timer);
    }, [busy, review]);

    const startReview = () => {
        setStartError('');
        return global.http.post('/my-code-review-start', { submissionId: Number(id) }, { wo_notify: true })
            .then(() => setReview(r => ({ ...r, status: 'pending' })))
            .catch(e => setStartError(
                (e && (e.msg || e.error || e.message || e.errmsg)) || 'Не удалось запустить ИИ-оценку. Попробуйте позже.'
            ));
    };

    if (loading) return <div className={styles.page}>Загрузка...</div>;
    if (!review) return <div className={styles.page}>Не найдено</div>;

    const score = review.score;
    const scores = (review.result || {}).scores || {};
    const metrics = CRITERIA
        .map(({ key, name }) => ({ key, name, value: scores[key] }))
        .filter(m => typeof m.value === 'number');
    return (
        <div className={styles.page}>
            <Link to="/evaluations?mode=tasks" style={{ fontSize: 13, color: 'var(--bs-text-muted)' }}>← Все оценки</Link>

            <div className={`card ${styles.infoCardSpacing}`}>
                <div className={`card-body ${styles.hero}`} data-testid="evaluation-hero">
                    <div className={styles.heroMain}>
                        <div className={styles.title}>Задача</div>
                        <div className={styles.questionText}>{review.title || `Задача #${review.question}`}</div>
                        <div className={styles.chips}>
                            <span className={styles.chip}>Решение задачи</span>
                            {review.cd && <span className={styles.chip}>{new Date(review.cd).toLocaleString('ru')}</span>}
                            {score != null && (
                                <span className={`${styles.chip} ${styles.chipVerdict}`} data-testid="evaluate-verdict">
                                    {scoreVerdict(score)}
                                </span>
                            )}
                        </div>
                        {review.description && <p className={styles.mentorComment} data-testid="task-description">{review.description}</p>}
                    </div>
                </div>
                <MentorReviewSection review={review.mentorReview} autoScore={score}/>
            </div>

            {metrics.length > 0 && (
                <div className={`card ${styles.stripCard}`} data-testid="evaluation-strip-card">
                    <div className={`card-body ${styles.strip}`} data-testid="evaluation-strip">
                        {score != null && (
                            <MetricChip lead label="Общая оценка" value={formatScore(score)} suffix="/10"
                                        pct={score} max={10} data-testid="evaluate-score" data-score={score}/>
                        )}
                        {metrics.map(({ key, name, value }) => (
                            <MetricChip key={key} label={t(name)} value={formatScore(value)} suffix="/10"
                                        pct={value} max={10} data-testid="metric-breakdown-row"/>
                        ))}
                    </div>
                </div>
            )}

            <div className="card">
                <div className="card-body">
                    {startError && (
                        <div className="alert alert-danger" role="alert" data-testid="ai-review-start-error">{startError}</div>
                    )}
                    <ExamTaskAiReview review={review} onStart={review.exam ? undefined : startReview}/>
                </div>
            </div>
        </div>
    );
}
