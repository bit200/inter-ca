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

function getByPath(obj, path) {
    return path.split('.').reduce((cur, k) => cur != null ? cur[k] : undefined, obj);
}

function groupAdvice(rules, schemas, result) {
    const schemaByKey = {};
    schemas.forEach(s => { schemaByKey[s.key] = s; });

    const groups = {};
    rules.forEach(rule => {
        if (!rule.key || rule.from == null || rule.to == null) return;
        const val = getByPath(result, rule.key);
        if (val == null || typeof val !== 'number') return;
        if (val < rule.from || val > rule.to) return;

        const group = schemaByKey[rule.key]?.group || 'Общее';
        if (!groups[group]) groups[group] = [];
        groups[group].push(rule);
    });
    return groups;
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

function AdviceSection({ rules, schemas, result }) {
    const groups = groupAdvice(rules, schemas, result);
    const groupNames = Object.keys(groups);
    if (!groupNames.length) return null;

    return (
        <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>Советы</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {groupNames.map(group => (
                    <div key={group}>
                        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: '#888', marginBottom: 6 }}>
                            {group}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {groups[group].map((rule, i) => (
                                <div key={i} style={{
                                    display: 'flex',
                                    gap: 10,
                                    background: '#f0f7ff',
                                    borderLeft: '3px solid #4a9eff',
                                    borderRadius: '0 6px 6px 0',
                                    padding: '10px 14px',
                                }}>
                                    <span style={{ fontSize: 16, lineHeight: 1 }}>💡</span>
                                    <span style={{ fontSize: 14, lineHeight: 1.5, color: '#333' }}>{rule.advice}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function EvaluationDetail() {
    const { id } = useParams();
    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [adviceRules, setAdviceRules] = useState([]);
    const [metricSchemas, setMetricSchemas] = useState([]);

    useEffect(() => {
        global.http.get('/evaluate-details', { quizHistoryId: id })
            .then(data => setItem(data))
            .catch(() => setItem(null))
            .finally(() => setLoading(false));

        global.http.get('/eval-advice-rule', { per_page: 200 }).then(r => {
            setAdviceRules(r.items || []);
        });

        global.http.get('/eval-metric-schemas').then(r => {
            setMetricSchemas(r.items || []);
        });
    }, [id]);

    if (loading) return <div style={{ padding: 20 }}>Загрузка...</div>;
    if (!item || item.error) return <div style={{ padding: 20, color: '#cc3333' }}>Не найдено</div>;

    const ev = item.evaluate || {};
    const result = ev.result || {};
    const score = result.score;
    const feedback = result.feedback;

    const processingMs = ev.processingStartedAt && ev.processingEndedAt
        ? new Date(ev.processingEndedAt) - new Date(ev.processingStartedAt)
        : null;

    const questionText = result.question || getQuestionTitle(item);
    const answerText = result.text;

    return (
        <div style={{ padding: 20, maxWidth: 720 }}>
            <Link to="/evaluations" style={{ fontSize: 13, color: '#555' }}>← Все оценки</Link>

            <div style={{ marginTop: 16, marginBottom: 12, background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: '#aaa', marginBottom: 6 }}>Вопрос</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#222', lineHeight: 1.4 }}>{questionText}</div>
            </div>

            {answerText && (
                <div style={{ marginBottom: 16, background: '#fafafa', border: '1px solid #e8e8e8', borderRadius: 8, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: '#aaa' }}>Ответ кандидата</div>
                        <button
                            className="btn btn-sm btn-light"
                            style={{ fontSize: 12 }}
                            onClick={() => myPlayer({ hash: item.hash, user: item.user })}
                        >
                            <span className="fa fa-play-circle" style={{ marginRight: 4 }} />Слушать
                        </button>
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.7, color: '#333' }}>{answerText}</div>
                </div>
            )}

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
                <span style={{ fontSize: 13, color: STATUS_COLOR[ev.status] || '#999', fontWeight: 600 }}>
                    {STATUS_LABEL[ev.status] || ev.status}
                </span>
                {!answerText && (
                    <button
                        className="btn btn-sm btn-light"
                        onClick={() => myPlayer({ hash: item.hash, user: item.user })}
                    >
                        <span className="fa fa-play-circle" /> Слушать ответ
                    </button>
                )}
            </div>

            {ev.status === 'done' && (
                <>
                    {score != null && (
                        <div style={{ marginBottom: 20 }}>
                            <ScoreBar score={score} />
                        </div>
                    )}

                    <AdviceSection rules={adviceRules} schemas={metricSchemas} result={result} />

                    {feedback && (
                        <div style={{ background: '#f9f9f9', borderRadius: 6, padding: '12px 16px', marginBottom: 16 }}>
                            <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Комментарий ИИ</div>
                            <div style={{ fontSize: 15, lineHeight: 1.6 }}>{feedback}</div>
                        </div>
                    )}

                    {/*{Object.keys(result).filter(k => k !== 'score' && k !== 'feedback').length > 0 && (*/}
                    {/*    <div style={{ background: '#f9f9f9', borderRadius: 6, padding: '12px 16px', marginBottom: 16 }}>*/}
                    {/*        <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>Детали</div>*/}
                    {/*        {Object.entries(result)*/}
                    {/*            .filter(([k]) => k !== 'score' && k !== 'feedback')*/}
                    {/*            .map(([k, v]) => (*/}
                    {/*                <div key={k} style={{ fontSize: 14, marginBottom: 4 }}>*/}
                    {/*                    <span style={{ color: '#555', marginRight: 8 }}>{k}:</span>*/}
                    {/*                    <span>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>*/}
                    {/*                </div>*/}
                    {/*            ))*/}
                    {/*        }*/}
                    {/*    </div>*/}
                    {/*)}*/}
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
