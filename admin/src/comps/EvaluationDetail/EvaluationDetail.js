import React, { useEffect, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';

import sse from '../../libs/sse/sse';
import Button from '../../libs/Button';
import styles from './evaluationDetail.module.scss';
import ScoreBar from "./components/ScoreBar";
import AdviceSection from "./components/AdviceSection";
import ExplainSection from "./components/ExplainSection";
import { STATUS_LABEL, STATUS_COLOR } from "./evaluationStatus";

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
    // Came from EvaluationListItemGroup's Link state={{ groupMode }} - falls back to
    // 'exam' for a direct/refreshed visit with no navigation state at all.
    const backGroupMode = useLocation().state?.groupMode === 'module' ? 'module' : 'exam';
    const backTo = backGroupMode === 'module' ? '/evaluations?mode=module' : '/evaluations';
    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingOriginalAudio, setLoadingOriginalAudio] = useState(false);
    const [adviceRules, setAdviceRules] = useState([]);
    const [metricSchemas, setMetricSchemas] = useState([]);

    const loadItem = () => global.http.get('/evaluate-details', { quizHistoryId: id }, { wo_notify: true })
        .then(data => setItem(data))
        .catch(() => setItem(null))
        .finally(() => setLoading(false));

    useEffect(() => {
        loadItem();

        global.http.get('/eval-advice-rule', { per_page: 200 }, { wo_notify: true }).then(r => {
            setAdviceRules(r.items || []);
        }).catch(() => {});

        global.http.get('/eval-metric-schemas', {}, { wo_notify: true }).then(r => {
            setMetricSchemas(r.items || []);
        }).catch(() => {});
    }, [id]);

    // Live status/result updates (pending -> processing -> done/error) without the
    // candidate having to reload - loadItem() above still owns the initial full fetch
    // (question text, questionInfo, ...), this only patches `evaluate` as it changes.
    useEffect(() => {
        return sse.subscribe(`/evaluate-events/${id}`, evaluate => {
            setItem(prev => prev && { ...prev, evaluate });
        });
    }, [id]);

    const explainSingle = () => global.http.post('/evaluate-explain', { quizHistoryId: id }, { wo_notify: true });

    if (loading) {
        return <div style={{ padding: 20 }}>Загрузка...</div>;
    }
    if (!item || item.error) {
        return <div style={{ padding: 20, color: STATUS_COLOR.error }}>Не найдено</div>;
    }

    const ev = item.evaluate || {};
    const result = ev.result || {};
    const score = result.score;

    const questionText = result.question || getQuestionTitle(item);
    const answerText = result.text;
    const hasOriginalAudio = item.answerType === 'audio' && item.hash && item.user;

    // window.myPlayer() resolves and buffers the audio async (fetch + <audio> canplay)
    // before the player UI ever appears, so we bridge Player.js's myPlayerReady/Error
    // events back here to keep the button visibly "loading" for that whole stretch
    // instead of it looking clickable-but-dead for several seconds.
    const playOriginalAudio = (scb, errCb) => {
        setLoadingOriginalAudio(true);

        const finish = (cb) => {
            window.removeEventListener('myPlayerReady', onReady);
            window.removeEventListener('myPlayerError', onError);
            clearTimeout(timeoutId);
            setLoadingOriginalAudio(false);
            cb && cb();
        };
        const onReady = () => finish(scb);
        const onError = () => finish(errCb);
        const timeoutId = setTimeout(() => finish(scb), 20000);

        window.addEventListener('myPlayerReady', onReady);
        window.addEventListener('myPlayerError', onError);

        window.myPlayer({ src: '' });
        window.myPlayer({ user: item.user, hash: item.hash });
    };

    return (
        <div style={{ padding: 20 }}>
            <Link to={backTo} style={{ fontSize: 13, color: 'var(--bs-text-muted)' }}>← Все оценки</Link>

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

            {answerText && (
                <div className={styles.infoCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div className={styles.title}>Распознанный текст ответа</div>
                        {hasOriginalAudio && (
                            <Button id="evaluate-play-original-audio" onClick={playOriginalAudio}
                                    disabled={loadingOriginalAudio}
                                    color={loadingOriginalAudio ? 4 : 3} size="sm"
                                    icon={loadingOriginalAudio ? '' : 'iconoir-play'}>
                                {loadingOriginalAudio
                                    ? <span className="spinner-border spinner-border-sm" role="status"/>
                                    : null}
                                {' '}{loadingOriginalAudio ? 'Загрузка...' : 'Прослушать оригинал'}
                            </Button>
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

            {score != null && (
                <ExplainSection onExplain={explainSingle} />
            )}

            <div className={styles.bottomInfo}>
                {item.cd && <span>Дата ответа: {new Date(item.cd).toLocaleString('ru')}</span>}
            </div>
        </div>
    );
}
