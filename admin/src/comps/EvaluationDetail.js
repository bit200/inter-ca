import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

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
    if (ti.title || ti.smallTitle || ti.desc) {
        return ti.title || ti.smallTitle || ti.desc;
    }
    const qi = item.questionInfo || {};
    return qi.title || qi.name || `Вопрос #${item.question}`;
}

function ScoreBar({ score, max = 10 }) {
    const pct = Math.round((score / max) * 100);
    const color = score >= 7 ? '#2a9d2a' : score >= 4 ? '#f0a500' : '#cc3333';
    return (
        <div>
            <div style={{ fontSize: 36, fontWeight: 700, color }}>{score}<span style={{ fontSize: 16, color: '#999' }}>/{max}</span></div>
            <div style={{ background: '#eee', borderRadius: 4, height: 8, marginTop: 6, width: '100%' }}>
                <div style={{ background: color, borderRadius: 4, height: 8, width: `${pct}%` }} />
            </div>
        </div>
    );
}

export default function EvaluationDetail() {
    const { id } = useParams();
    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        global.http.get('/evaluate-details', { quizHistoryId: id })
            .then(data => setItem(data))
            .catch(() => setItem(null))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <div style={{ padding: 20 }}>Загрузка...</div>;
    if (!item || item.error) return <div style={{ padding: 20, color: '#cc3333' }}>Не найдено</div>;

    const ev = item.evaluate || {};
    const result = ev.result || {};
    const score = result.score;
    const feedback = result.feedback;

    console.log('LOOOG result', result);

    const processingMs = ev.processingStartedAt && ev.processingEndedAt
        ? new Date(ev.processingEndedAt) - new Date(ev.processingStartedAt)
        : null;

    return (
        <div style={{ padding: 20, maxWidth: 720 }}>
            <Link to="/evaluations" style={{ fontSize: 13, color: '#555' }}>← Все оценки</Link>

            <h4 style={{ marginTop: 16, marginBottom: 4 }}>{getQuestionTitle(item)}</h4>

            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
                <span style={{ color: STATUS_COLOR[ev.status] || '#999', fontWeight: 600 }}>
                    {STATUS_LABEL[ev.status] || ev.status}
                </span>
                <button
                    className="btn btn-sm btn-light"
                    onClick={() => myPlayer({ hash: item.hash, user: item.user })}
                >
                    <span className="fa fa-play-circle" /> Слушать ответ
                </button>
            </div>

            {ev.status === 'done' && (
                <>
                    {score != null && (
                        <div style={{ marginBottom: 20 }}>
                            <ScoreBar score={score} />
                        </div>
                    )}

                    {feedback && (
                        <div style={{ background: '#f9f9f9', borderRadius: 6, padding: '12px 16px', marginBottom: 16 }}>
                            <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Комментарий ИИ</div>
                            <div style={{ fontSize: 15, lineHeight: 1.6 }}>{feedback}</div>
                        </div>
                    )}

                    {Object.keys(result).filter(k => k !== 'score' && k !== 'feedback').length > 0 && (
                        <div style={{ background: '#f9f9f9', borderRadius: 6, padding: '12px 16px', marginBottom: 16 }}>
                            <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>Детали</div>
                            {Object.entries(result)
                                .filter(([k]) => k !== 'score' && k !== 'feedback')
                                .map(([k, v]) => (
                                    <div key={k} style={{ fontSize: 14, marginBottom: 4 }}>
                                        <span style={{ color: '#555', marginRight: 8 }}>{k}:</span>
                                        <span>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                                    </div>
                                ))
                            }
                        </div>
                    )}
                </>
            )}

            {ev.status === 'error' && ev.error && (
                <div style={{ color: '#cc3333', fontSize: 14, marginBottom: 16 }}>
                    <strong>Ошибка:</strong> {ev.error}
                </div>
            )}

            <div style={{ fontSize: 12, color: '#bbb', marginTop: 8 }}>
                {item.cd && <span>Ответ: {new Date(item.cd).toLocaleString('ru')}</span>}
                {processingMs != null && (
                    <span style={{ marginLeft: 16 }}>Обработка: {(processingMs / 1000).toFixed(1)}с</span>
                )}
            </div>
        </div>
    );
}
