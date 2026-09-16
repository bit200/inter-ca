import React, {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import styles from './rolesPendingInterviews.module.scss';

// Уведомление над «Моими интервью»: разбор записи готов, но роли участников не
// определились ни автоматически, ни моделью - оценка ответов и мок-интервью по
// слабым местам стоят, пока кандидат не отметит, кто интервьюер, а кто кандидат.
// Список - GET /my-interview-roles-pending (controllers/interviewVideoEvaluate.js
// в itk-platform-en), ссылка ведёт сразу на вкладку разбора, где размечают роли.
export default function RolesPendingInterviews() {
    let [items, setItems] = useState([]);

    useEffect(() => {
        global.http.get('/my-interview-roles-pending', {}, {wo_notify: true})
            .then(r => setItems((r && r.items) || []))
            .catch(() => setItems([]));
    }, []);

    if (!items.length) return null;

    return <section className={styles.notice} data-testid="roles-pending-interviews">
        <h5 className={styles.title}>
            {items.length === 1 ? 'Оценка интервью ждёт вас' : `Оценка ${items.length} интервью ждёт вас`}
        </h5>
        <p className={styles.hint}>
            По записи не удалось понять, кто интервьюер, а кто кандидат. Отметьте роли — и оценка продолжится сама.
        </p>
        <ul className={styles.list}>
            {items.map(item => <li key={item._id}>
                <Link to={`/interviews/${item._id}?tab=dialog`} data-testid="roles-pending-interview-link">
                    {item.name || `Интервью #${item._id}`}
                </Link>
            </li>)}
        </ul>
    </section>;
}
