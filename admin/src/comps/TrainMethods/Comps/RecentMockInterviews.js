import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { attemptStatusLabel } from '../../MockInterview/components/attemptStatus';

const RECENT_COUNT = 10;

// Совпадает с MockInterviewWidget.js/MockInterviewAttemptHistory.js/averageScore -
// отдельного поля с итоговым баллом на самой попытке нет, поэтому усредняем по
// evaluate[] (тот же паттерн дублируется в каждом месте, где нужен балл попытки).
function averageScore(attempt) {
    const scores = (attempt.evaluate || [])
        .map(entry => entry?.evaluate?.score)
        .filter(score => typeof score === 'number');
    if (!scores.length) return null;
    return Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10;
}

// Содержимое новой вкладки "Мок-интервью" на дашборде - последние 10 попыток,
// новые сверху. Тот же эндпоинт, что уже использует MockInterviewWidget.js
// (GET /mock-interview/my-list без фильтра) - см. допущение о скоупе на
// текущего пользователя там же и в описании PR.
function RecentMockInterviews() {
    const [items, setItems] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        global.http.get('/mock-interview/my-list', {}, { wo_notify: true })
            .then(r => setItems(r?.items || []))
            .catch(() => setItems(null))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return <div className="card"><div className="card-body">Загрузка...</div></div>;
    }

    if (!items || !items.length) {
        return <div className="card"><div className="card-body text-muted">Пока нет пройденных мок-интервью</div></div>;
    }

    const visible = items
        .slice()
        .sort((a, b) => new Date(b.cd || 0) - new Date(a.cd || 0))
        .slice(0, RECENT_COUNT);

    return (
        <div className="card" data-testid="recent-mock-interviews">
            <div className="card-body">
                {visible.map(item => {
                    const score = averageScore(item);
                    return (
                        <div key={item._id} className="d-flex align-items-center justify-content-between border-dashed-bottom pb-2 mb-2"
                             data-testid="recent-mock-interview-item" data-item-id={item._id}>
                            <Link to={`/mock-interviews/${item._id}`} className="text-truncate" style={{ flex: 1, marginRight: 10 }}>
                                {item.name || 'Мок-интервью'}
                            </Link>
                            <span className="fs-12 fw-semibold text-muted me-2" style={{ whiteSpace: 'nowrap' }}>
                                {attemptStatusLabel(item)}
                            </span>
                            {score != null && (
                                <span className="fw-bold text-success" style={{ whiteSpace: 'nowrap' }}>
                                    {score}/10
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default RecentMockInterviews;
