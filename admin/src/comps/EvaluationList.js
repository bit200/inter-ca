import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import UseLocalStorage from 'libs/UseLocalStorage';

const STATUS_LABEL = {
    pending: 'Ожидает',
    processing: 'Оценивается...',
    done: 'Оценено',
    error: 'Ошибка',
};

const STATUS_COLOR = {
    pending: '#999',
    processing: '#f0a500',
    done: '#2a9d2a',
    error: '#cc3333',
};

function getQuestionTitle(item) {
    const ti = item.titleInfo || {};
    return ti.title || ti.smallTitle || ti.desc || `Вопрос #${item.question}`;
}

function EvaluationList() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [, setLastSeenDone] = UseLocalStorage('evaluateLastSeenDone', 0);

    useEffect(() => {
        global.http.get('/evaluate-list', {}).then(data => {
            const list = data || [];
            setItems(list);
            const doneCount = list.filter(it => it.evaluate?.status === 'done').length;
            setLastSeenDone(doneCount);
        }).finally(() => setLoading(false));
    }, []);

    if (loading) return <div>Загрузка...</div>;

    const done = items.filter(it => it.evaluate?.status === 'done').length;
    const total = items.length;

    return (
        <div style={{ padding: '20px' }}>
            <h4>Оценки ИИ — {done}/{total}</h4>
            <hr />
            {!items.length && <div style={{ color: '#999' }}>Нет оценок</div>}
            {items.map(item => {
                const ev = item.evaluate || {};
                const score = ev.result?.score;
                return (
                    <div key={item._id} style={{ borderBottom: '1px solid #eee', padding: '12px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                            <Link to={`/evaluations/${item._id}`} style={{ fontWeight: 500, fontSize: 14 }}>
                                {getQuestionTitle(item)}
                            </Link>
                            <span style={{ color: STATUS_COLOR[ev.status] || '#999', fontSize: 12, fontWeight: 600 }}>
                                {STATUS_LABEL[ev.status] || ev.status}
                            </span>
                            {score != null && (
                                <span style={{ fontWeight: 700, fontSize: 15 }}>{score}/10</span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default EvaluationList;