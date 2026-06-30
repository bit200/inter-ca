import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const STATUS_LABEL = { pending: 'Ожидает ИИ', processing: 'ИИ оценивает...', done: 'ИИ оценил', error: 'Ошибка ИИ' };
const STATUS_COLOR = { pending: '#999', processing: '#f0a500', done: '#2a9d2a', error: '#cc3333' };

export default function QuizEvaluationBadge({ examId, questionId }) {
    const [evalItem, setEvalItem] = useState(null);

    useEffect(() => {
        if (!examId || !questionId) return;
        global.http.get('/evaluate-list', { exam: examId }).then(items => {
            const found = (items || []).find(it => it.question == questionId);
            setEvalItem(found || null);
        }).catch(() => {});
    }, [examId, questionId]);

    if (!evalItem) return null;

    const ev = evalItem.evaluate || {};
    const score = ev.result?.score;
    const color = STATUS_COLOR[ev.status] || '#999';

    return (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color, fontWeight: 600 }}>
                {ev.status === 'processing' && <span style={{ marginRight: 5 }}>⏳</span>}
                {ev.status === 'done' && <span style={{ marginRight: 5 }}>✓</span>}
                {STATUS_LABEL[ev.status] || ev.status}
            </span>
            {score != null && (
                <span style={{ fontSize: 13, fontWeight: 700, color: score >= 7 ? STATUS_COLOR.done : score >= 4 ? '#f0a500' : STATUS_COLOR.error }}>
                    {score}/10
                </span>
            )}
            {ev.status === 'done' && (
                <Link to={`/evaluations/${evalItem._id}`} style={{ fontSize: 12 }}>Детали →</Link>
            )}
        </div>
    );
}