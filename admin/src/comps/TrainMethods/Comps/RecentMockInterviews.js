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

function attemptTime(attempt) {
    return new Date(attempt?.cd || 0).getTime() || 0;
}

// Список во вкладке - про интервью, а не про попытки: одно и то же интервью,
// пройденное трижды, раньше занимало три одинаковые строки подряд и вытесняло
// остальные. Схлопываем попытки по interviewId (у старых записей его может не
// быть - тогда ключом служит название, и в крайнем случае сама попытка), в
// строке оставляем самую свежую попытку и число попыток рядом с названием.
export function groupAttemptsByInterview(items) {
    const groups = new Map();
    (items || []).forEach(attempt => {
        const key = attempt.interviewId || attempt.name || attempt._id;
        const group = groups.get(key);
        if (!group) {
            groups.set(key, { key, latest: attempt, attempts: 1 });
            return;
        }
        group.attempts += 1;
        if (attemptTime(attempt) > attemptTime(group.latest)) {
            group.latest = attempt;
        }
    });
    return [...groups.values()].sort((a, b) => attemptTime(b.latest) - attemptTime(a.latest));
}

// Содержимое вкладки "Мок-интервью" на дашборде - последние 10 интервью, новые
// сверху. Тот же эндпоинт, что уже использует MockInterviewWidget.js
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

    const visible = groupAttemptsByInterview(items).slice(0, RECENT_COUNT);

    return (
        <div className="card" data-testid="recent-mock-interviews">
            <div className="card-body">
                {visible.map(({ key, latest, attempts }) => {
                    const score = averageScore(latest);
                    return (
                        <div key={key} className="d-flex align-items-center justify-content-between border-dashed-bottom pb-2 mb-2"
                             data-testid="recent-mock-interview-item" data-item-id={latest._id}>
                            <div className="text-truncate" style={{ flex: 1, marginRight: 10, minWidth: 0 }}>
                                <Link to={`/mock-interviews/${latest._id}`} className="d-block text-truncate fw-semibold">
                                    {latest.name || 'Мок-интервью'}
                                </Link>
                                {attempts > 1 && (
                                    <span className="fs-12 text-muted" data-testid="recent-mock-interview-attempts">
                                        {attempts + ' ' + attemptsWord(attempts) + ' · показана последняя'}
                                    </span>
                                )}
                            </div>
                            <span className="fs-12 fw-semibold text-muted me-2" style={{ whiteSpace: 'nowrap' }}>
                                {attemptStatusLabel(latest)}
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

function attemptsWord(count) {
    const tail = count % 100;
    if (tail >= 11 && tail <= 14) return 'попыток';
    const last = count % 10;
    if (last === 1) return 'попытка';
    if (last >= 2 && last <= 4) return 'попытки';
    return 'попыток';
}

export default RecentMockInterviews;
