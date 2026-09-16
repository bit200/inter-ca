import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from '../mockInterview.module.scss';

function formatDate(cd) {
    const date = new Date(cd);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Название попытки для таблицы /mock-interviews: без него строка выходит пустой.
export function personalName(row) {
    const date = row.cd ? formatDate(row.cd) : '';
    return date ? `Персональное интервью от ${date}` : 'Персональное интервью';
}

// Секция "Собрано по вашим ответам" над списком попыток /mock-interviews.
// Персональные мок-интервью (PersonalMockInterviewGeneration в itk-platform-en)
// не привязаны ни к курсу, ни к шаблону экзамена, поэтому источник у них свой -
// GET /my-personal-mock-interview (только published и только свои). Запуск -
// тем же POST /mock-interview/my-list с interviewId, что у курса и экзамена:
// он резолвит существующую попытку или создаёт новую, дальше обычная страница
// /mock-interviews/:id. Нет записей или ручка недоступна - секцию не рисуем.
// Интервью, по которому у кандидата уже есть попытка (начатая или пройденная),
// в секции не показываем: оно уже строка таблицы ниже, второй вход не нужен.
function PersonalMockInterviews() {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [startingId, setStartingId] = useState(null);

    useEffect(() => {
        global.http.get('/my-personal-mock-interview', {}, { wo_notify: true })
            .then(r => {
                const personal = r?.items || [];
                if (!personal.length) return [];
                const interviewId = { $in: personal.map(row => row.interviewId) };
                return global.http.get('/mock-interview/my-list', { filter: { interviewId } }, { wo_notify: true })
                    .then(attempts => {
                        const taken = new Set((attempts?.items || []).map(a => String(a.interviewId)));
                        return personal.filter(row => !taken.has(String(row.interviewId)));
                    });
            })
            .then(setItems)
            .catch(() => setItems([]));
    }, []);

    if (!items.length) return null;

    const start = (row) => {
        const interviewId = row.interviewId;
        setStartingId(interviewId);
        global.http.post('/mock-interview/my-list', { interviewId, name: personalName(row) }, { wo_notify: true })
            .then(({ item }) => navigate(`/mock-interviews/${item._id}`))
            .catch(() => {
                global.notify.warning('Не удалось открыть интервью. Попробуйте ещё раз.');
                setStartingId(null);
            });
    };

    return (
        <section className={styles.personalSection} data-testid="personal-mock-interviews">
            <h5 className={styles.personalTitle}>Собрано по вашим ответам</h5>
            <p className={styles.personalHint}>
                Вопросы подобраны по темам, где в прошлых интервью были ошибки.
            </p>
            {items.map(row => (
                <div key={row.interviewId} className={styles.personalRow} data-testid="personal-mock-interview-item">
                    <div className={styles.personalName}>
                        Персональное интервью
                        {row.cd && <span className="text-muted"> от {formatDate(row.cd)}</span>}
                        {/* Обратная сторона связи: откуда взяты вопросы - разбор
                            того интервью, где на них ответили слабо. */}
                        {row.sourceInterviewId != null && <Link
                            className={styles.personalSource}
                            data-testid="personal-mock-interview-source"
                            to={`/interviews/${row.sourceInterviewId}?tab=dialog`}
                        >по разбору интервью</Link>}
                    </div>
                    <button
                        className="btn btn-sm btn-primary"
                        data-testid="personal-mock-interview-start"
                        disabled={!!startingId}
                        onClick={() => start(row)}
                    >
                        {startingId === row.interviewId ? 'Открываем...' : 'Начать'}
                    </button>
                </div>
            ))}
        </section>
    );
}

export default PersonalMockInterviews;
