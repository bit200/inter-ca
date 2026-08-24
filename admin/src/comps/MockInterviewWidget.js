import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const PASSED_STATUSES = ['completed', 'evaluated'];

// Совпадает с MockInterviewAttemptHistory.js/averageScore - отдельного поля с
// итоговым баллом на самой попытке нет, поэтому усредняем по evaluate[].
function averageScore(attempt) {
    const scores = (attempt.evaluate || [])
        .map(entry => entry?.evaluate?.score)
        .filter(score => typeof score === 'number');
    if (!scores.length) return null;
    return Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10;
}

function MockInterviewWidget() {
    const [items, setItems] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Бэкенд мок-интервью не в этом репозитории. MockInterview.js уже вызывает
        // GET /mock-interview/my-list с filter.interviewId для истории попыток по
        // одному интервью - здесь тот же эндпоинт без фильтра, в расчёте, что он
        // так же скоуплен на текущего пользователя (общий getList-паттерн проекта).
        // Если это не так - виджет просто не покажется (см. catch ниже), без падения.
        global.http.get('/mock-interview/my-list', {}, { wo_notify: true })
            .then(r => setItems(r.items || []))
            .catch(() => setItems(null))
            .finally(() => setLoading(false));
    }, []);

    if (loading || !items) return null;

    const completed = items.filter(a => PASSED_STATUSES.includes(a.status));
    if (!completed.length) return null;

    const latest = completed.slice().sort((a, b) => new Date(b.cd) - new Date(a.cd))[0];
    const score = averageScore(latest);

    return (
        <div className="card" data-testid="mock-interview-widget">
            <div className="card-body">
                <div className="row d-flex justify-content-center border-dashed-bottom pb-3">
                    <div className="col-lg-8">
                        <p className="text-dark mb-0 fw-semibold fs-14">Мок-интервью</p>
                        <h3 className="mt-2 mb-0 fw-bold">
                            {score != null ? score : '—'}
                            <span className="text-muted fs-14">{score != null ? '/10' : ''}</span>
                        </h3>
                    </div>
                    <div className="col-lg-4 align-self-center tr">
                        <div className="d-flex justify-content-center align-items-center thumb-xl bg-light rounded-circle mx-auto">
                            <i className="iconoir-microphone h1 align-self-center mb-0 text-secondary"></i>
                        </div>
                    </div>
                </div>

                <div className="pull-right" style={{ marginTop: '15px' }}>
                    <Link to={`/mock-interviews/${latest._id}`} className="btn btn-light btn-sm" data-testid="mock-interview-widget-link">
                        <i className="iconoir-double-check"></i>
                        {' '}Смотреть фидбек
                    </Link>
                </div>

                <p className="mb-0 text-truncate text-muted mt-3 statsListHead">
                    {latest.name || 'Последнее интервью'}
                </p>
            </div>
        </div>
    );
}

export default MockInterviewWidget;
