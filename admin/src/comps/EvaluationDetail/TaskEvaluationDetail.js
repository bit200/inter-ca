import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import styles from './evaluationDetail.module.scss';
import ExamTaskAiReview from '../RunExam/ExamTaskAiReview';
import { scoreVerdict } from './components/scoreVerdict';

// Страница разбора ИИ-проверки задачи модуля (без экзамена): /evaluations/task/:id.
// Оформление - то же, что у разбора ответа (/evaluations/:id): шапка-карточка с
// названием, чипами и вердиктом, ниже сам разбор.
export default function TaskEvaluationDetail() {
    const { id } = useParams();
    const [review, setReview] = useState(null);
    const [loading, setLoading] = useState(true);

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

    const startReview = () => global.http.post('/my-code-review-start', { submissionId: Number(id) }, { wo_notify: true })
        .then(() => setReview(r => ({ ...r, status: 'pending' })))
        .catch(() => {});

    if (loading) return <div className={styles.page}>Загрузка...</div>;
    if (!review) return <div className={styles.page}>Не найдено</div>;

    const score = review.score;
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
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-body">
                    <ExamTaskAiReview review={review} onStart={review.exam ? undefined : startReview}/>
                </div>
            </div>
        </div>
    );
}
