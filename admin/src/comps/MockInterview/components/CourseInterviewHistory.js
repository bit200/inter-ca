import React, {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import styles from '../mockInterview.module.scss';
import {attemptScoreSummary} from './evaluateJobState';

const PASSED_STATUSES = ['completed', 'evaluated'];
const UNFINISHED_STATUSES = ['draft', 'active', 'started'];

const STATUS_LABEL = {
    draft: 'Ожидает',
    active: 'Ожидает',
    started: 'Начато',
    completed: 'Завершено',
    evaluated: 'Завершено',
};

// История попыток интервью прямо на странице курса: кнопка "Проверить знания"
// теперь уводит сразу в iframe и никакого промежуточного экрана со списком не
// показывает, поэтому прошлые попытки должны быть видны здесь же, ниже кнопки.
// Список только для чтения - пройти заново можно всё той же кнопкой, а разбор
// ответов открывается по строке на обычной странице /mock-interviews/:id.
function CourseInterviewHistory({interviewId, reloadKey}) {
    const [items, setItems] = useState([]);

    useEffect(() => {
        if (!interviewId) {
            setItems([]);
            return;
        }
        global.http.get('/mock-interview/my-list', {filter: {interviewId}}, {wo_notify: true})
            .then(r => setItems((r.items || []).slice().sort((a, b) => new Date(b.cd) - new Date(a.cd))))
            .catch(() => {});
    }, [interviewId, reloadKey]);

    if (!interviewId || !items.length) {
        return null;
    }

    return (
        <div className="card" style={{marginTop: 20, textAlign: 'left'}} data-testid="course-interview-history">
            <div className={`card-body ${styles.cardBody}`}>
                <p className={styles.cardName}>{t('attemptHistory') || 'История попыток'}</p>
                <div className={styles.attemptsRows}>
                    {items.map((attempt, ind) => {
                        const passed = PASSED_STATUSES.includes(attempt.status);
                        const {score, scored, total} = passed
                            ? attemptScoreSummary(attempt)
                            : {score: null, scored: 0, total: 0};
                        const partial = score != null && total > 0 && scored < total;
                        const unfinished = UNFINISHED_STATUSES.includes(attempt.status);
                        return (
                            <Link
                                key={attempt._id}
                                to={`/mock-interviews/${attempt._id}`}
                                className={styles.attemptRow}
                                data-testid="course-interview-attempt-row"
                            >
                                <span className={styles.attemptRowNum}>
                                    {(t('attemptNumber') || 'Попытка') + ' ' + (attempt.attemptNumber || (items.length - ind))}
                                </span>
                                <span className={unfinished ? styles.cardStatusUnfinished : styles.attemptRowStatus}>
                                    {STATUS_LABEL[attempt.status] || attempt.status}
                                </span>
                                {attempt.cd && <span className={styles.attemptRowDate}>
                                    {new Date(attempt.cd).toLocaleString('ru')}
                                </span>}
                                <span className={styles.attemptRowScore}>
                                    {score != null
                                        ? (score + '/10' + (partial ? ' · ' + scored + ' из ' + total : ''))
                                        : (passed ? 'Без оценки' : '')}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default CourseInterviewHistory;
