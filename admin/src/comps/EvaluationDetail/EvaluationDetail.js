import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import sse from '../../libs/sse/sse';
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
    const [retrying, setRetrying] = useState(false);
    const [adviceRules, setAdviceRules] = useState([]);
    const [metricSchemas, setMetricSchemas] = useState([]);

    const loadItem = () => global.http.get('/evaluate-details', { quizHistoryId: id })
        .then(data => setItem(data))
        .catch(() => setItem(null))
        .finally(() => setLoading(false));

    useEffect(() => {
        loadItem();

        global.http.get('/eval-advice-rule', { per_page: 200 }).then(r => {
            setAdviceRules(r.items || []);
        });

        global.http.get('/eval-metric-schemas').then(r => {
            setMetricSchemas(r.items || []);
        });
    }, [id]);

    // Live status/result updates (pending -> processing -> done/error) without the
    // candidate having to reload - loadItem() above still owns the initial full fetch
    // (question text, questionInfo, ...), this only patches `evaluate` as it changes.
    useEffect(() => {
        return sse.subscribe(`/evaluate-events/${id}`, evaluate => {
            setItem(prev => prev && { ...prev, evaluate });
        });
    }, [id]);

    const retry = () => {
        setRetrying(true);
        global.http.post('/evaluate-retry', { quizHistoryId: id })
            .then(loadItem)
            .finally(() => setRetrying(false));
    };

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
    const hasOriginalAudio = item.answerType === 'audio' && item.hash && item.user;

    const playOriginalAudio = () => {
        window.myPlayer({ src: '' });
        window.myPlayer({ user: item.user, hash: item.hash, text: answerText });
    };

    return (
        <div style={{ padding: 20 }}>
            <Link to="/evaluations" style={{ fontSize: 13, color: '#555' }}>← Все оценки</Link>

            <div className={styles.infoCard}>
                <div className={styles.title}>Вопрос</div>
                <div className={styles.questionText}>{questionText}</div>
            </div>

            {(ev.status === 'pending' || ev.status === 'processing') && (
                <div className={styles.infoCard} data-testid="evaluate-status-card" data-status={ev.status}>
                    <div className={styles.title} style={{ color: STATUS_COLOR[ev.status] }}>
                        {STATUS_LABEL[ev.status]}
                    </div>
                </div>
            )}

            {ev.status === 'error' && (
                <div className={styles.infoCard} data-testid="evaluate-error-card">
                    <div className={styles.title} style={{ color: STATUS_COLOR.error }}>Ошибка оценки</div>
                    <div>{ev.error || 'Не удалось оценить ответ'}</div>
                    <button onClick={retry} disabled={retrying} data-testid="evaluate-retry-button"
                            className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
                        {retrying ? 'Повторяем...' : 'Повторить оценку'}
                    </button>
                </div>
            )}

            {answerText && (
                <div className={styles.infoCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div className={styles.title}>Распознанный текст ответа</div>
                        {hasOriginalAudio && (
                            <button onClick={playOriginalAudio} data-testid="evaluate-play-original-audio"
                                    className="btn btn-light btn-sm">
                                <i className="iconoir-play" style={{ marginRight: 5 }}></i>
                                Прослушать оригинал
                            </button>
                        )}
                    </div>
                    <div className={styles.answerText} >{answerText}</div>
                </div>
            )}

            {score != null && (
                <div style={{ marginBottom: 20 }} className={'card'}>
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
