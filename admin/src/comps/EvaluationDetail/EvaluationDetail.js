import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import styles from './evaluationDetail.module.scss';
import ScoreBar from "./components/ScoreBar";
import AdviceSection from "./components/AdviceSection";

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

    if (loading) {
        return <div style={{ padding: 20 }}>Загрузка...</div>;
    }
    if (!item || item.error) {
        return <div style={{ padding: 20, color: '#cc3333' }}>Не найдено</div>;
    }

    const ev = item.evaluate || {};
    const result = ev.result || {};
    const score = result.score;

    const questionText = result.question || getQuestionTitle(item);
    const answerText = result.text;

    return (
        <div style={{ padding: 20 }}>
            <Link to="/evaluations" style={{ fontSize: 13, color: '#555' }}>← Все оценки</Link>

            <div className={styles.infoCard}>
                <div className={styles.title}>Вопрос</div>
                <div className={styles.questionText}>{questionText}</div>
            </div>

            {answerText && (
                <div className={styles.infoCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div className={styles.title}>Распознанный текст ответа</div>
                    </div>
                    <div className={styles.answerText} >{answerText}</div>
                </div>
            )}

            {score != null && (
                <div style={{ marginBottom: 20 }}>
                    <ScoreBar score={score} />
                </div>
            )}

            {score != null && (
                <AdviceSection rules={adviceRules} schemas={metricSchemas} result={result} />
            )}

            <div className={styles.bottomInfo}>
                {item.cd && <span>Дата ответа: {new Date(item.cd).toLocaleString('ru')}</span>}
            </div>
        </div>
    );
}
