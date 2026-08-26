import React, { useEffect, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';

import sse from '../../libs/sse/sse';
import Button from '../../libs/Button';
import styles from './evaluationDetail.module.scss';
import ScoreStrip from "./components/ScoreStrip";
import AdviceSection from "./components/AdviceSection";
import ExplainSection from "./components/ExplainSection";
import MentorReviewSection from "./components/MentorReviewSection";
import { scoreVerdict } from "./components/scoreVerdict";
import { STATUS_LABEL, STATUS_COLOR } from "./evaluationStatus";

// Короткое название вопроса/задания, если оно есть отдельно от самого текста
// вопроса: в шапке стоит именно оно, а полный текст вопроса - репликой над
// ответом. Так вопрос не печатается на экране дважды.
function getContextTitle(item) {
    const ti = item.titleInfo || {};
    const qi = item.questionInfo || {};
    return ti.title || ti.smallTitle || ti.desc || qi.title || qi.name || null;
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
    // Узел в шапке, куда ExplainSection порталом кладёт свою кнопку: главное
    // действие экрана стоит рядом с баллом, а результат расшифровки - ниже,
    // на своём месте. callback-ref через useState, чтобы после монтирования
    // шапки произошёл ререндер и портал получил живой узел.
    const [explainSlot, setExplainSlot] = useState(null);

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

    // Ошибка теперь нигде не показывается пользователю (ни кнопки, ни текста) -
    // значит его больше некому нажать вручную. Вместо этого тихо просим бэкенд
    // повторить оценку сами, без UI-эффекта: если ретрай реально запустится,
    // это придёт тем же SSE-событием выше и просто обновит статус на экране.
    // Бэкенд сам решает, доступен ли ретрай (лимит попыток/интервал между ними) -
    // здесь только клиентский тротлинг, чтобы не долбить endpoint на каждый
    // ререндер/переход на страницу.
    useEffect(() => {
        const evStatus = item?.evaluate?.status;
        if (evStatus !== 'error' || item?.evaluate?.unrecoverable) return;

        const key = `evalAutoRetry:${id}`;
        const last = Number(localStorage.getItem(key) || 0);
        if (Date.now() - last < 10 * 60 * 1000) return;

        localStorage.setItem(key, String(Date.now()));
        global.http.post('/evaluate-retry', { quizHistoryId: id }, { wo_notify: true }).catch(() => {});
    }, [item?.evaluate?.status, item?.evaluate?.unrecoverable, id]);

    const explainSingle = () => global.http.post('/evaluate-explain', { quizHistoryId: id }, { wo_notify: true });

    if (loading) {
        return <div className={styles.page}>Загрузка...</div>;
    }
    if (!item || item.error) {
        return <div className={styles.page} style={{ color: STATUS_COLOR.error }}>Не найдено</div>;
    }

    const ev = item.evaluate || {};
    const result = ev.result || {};
    const score = result.score;

    const contextTitle = getContextTitle(item);
    const questionText = result.question || contextTitle || `Вопрос #${item.question}`;
    // Заголовок шапки: короткое название, а если его нет - сам вопрос (тогда
    // реплики с вопросом над ответом не будет, чтобы не дублировать текст).
    const heroTitle = contextTitle || questionText;
    const showQuestionTurn = questionText !== heroTitle;
    const answerText = result.text;
    const hasOriginalAudio = item.answerType === 'audio' && item.hash && item.user;

    // window.myPlayer() resolves and buffers the audio async (fetch + <audio> canplay)
    // before the player UI ever appears, so we bridge Player.js's myPlayerReady/Error
    // events back here to keep the button visibly "loading" for that whole stretch
    // instead of it looking clickable-but-dead for several seconds.
    const playOriginalAudio = (scb, errCb) => {
        // Аудио часто отдаётся почти мгновенно, и если включать "Загрузка..."
        // сразу, кнопка на долю секунды меняет подпись и тут же возвращает
        // прежнюю - на экране это выглядит как моргание. Показываем состояние
        // загрузки, только если ожидание реально затянулось.
        const showLoadingId = setTimeout(() => setLoadingOriginalAudio(true), 400);

        const finish = (cb) => {
            window.removeEventListener('myPlayerReady', onReady);
            window.removeEventListener('myPlayerError', onError);
            clearTimeout(timeoutId);
            clearTimeout(showLoadingId);
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
        <div className={styles.page}>
            <Link to={backTo} style={{ fontSize: 13, color: 'var(--bs-text-muted)' }}>← Все оценки</Link>

            {/* Шапка: вопрос и главные действия. Балл ушёл строкой ниже, в
                линейку чипов (ScoreStrip), - там он стоит рядом с показателями,
                из которых сложился, и меряется той же шкалой. */}
            <div className={`card ${styles.infoCardSpacing}`}>
                <div className={`card-body ${styles.hero}`} data-testid="evaluation-hero">
                    <div className={styles.heroMain}>
                        <div className={styles.title}>Вопрос</div>
                        <div className={styles.questionText}>{heroTitle}</div>
                        <div className={styles.chips}>
                            <span className={styles.chip}>
                                {item.answerType === 'audio' ? 'Голосовой ответ' : 'Текстовый ответ'}
                            </span>
                            {item.cd && (
                                <span className={styles.chip}>{new Date(item.cd).toLocaleString('ru')}</span>
                            )}
                            {score != null && (
                                <span className={`${styles.chip} ${styles.chipVerdict}`} data-testid="evaluate-verdict">
                                    {scoreVerdict(score)}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className={styles.heroActions}>
                        {/* Сюда ExplainSection порталом кладёт "Расшифровать оценку" */}
                        <div ref={setExplainSlot} className={styles.heroSlot}/>
                        {hasOriginalAudio && (
                            <Button id="evaluate-play-original-audio" onClick={playOriginalAudio}
                                    disabled={loadingOriginalAudio}
                                    className={styles.playOriginal}
                                    color={3} size="sm"
                                    icon={loadingOriginalAudio ? '' : 'iconoir-play'}>
                                {loadingOriginalAudio
                                    ? <span className="spinner-border spinner-border-sm" role="status"/>
                                    : null}
                                {' '}{loadingOriginalAudio ? 'Загрузка...' : 'Прослушать оригинал'}
                            </Button>
                        )}
                    </div>
                </div>

                {/* Оценка куратора - вторым ярусом той же карточки: она про тот
                    же ответ, что и балл выше, и её нельзя было потерять где-то
                    ниже по странице. */}
                <MentorReviewSection review={item.mentorReview} autoScore={score}/>
            </div>

            {/* Линейка оценки: общий балл и показатели одинаковыми чипами.
                Липнет к верху - при чтении длинного ответа видно, о какой
                оценке идёт речь. */}
            <ScoreStrip score={score} rules={adviceRules} schemas={metricSchemas} result={result}/>

            {(ev.status === 'pending' || ev.status === 'processing') && (
                <div className={`card ${styles.infoCardSpacing}`} data-testid="evaluate-status-card" data-status={ev.status}>
                    <div className="card-body">
                        <div className={styles.title} style={{ color: STATUS_COLOR[ev.status] }}>
                            {STATUS_LABEL[ev.status]}
                        </div>
                    </div>
                </div>
            )}

            {/* Ответ слева, разбор справа: пара "спросили - ответил" читается
                подряд, а метрики стоят рядом с текстом, а не под ним. */}
            <div className={styles.columns}>
                {answerText && (
                    <div className={'card'}>
                        <div className="card-body">
                            <div className={styles.title}>Как прошёл ответ</div>

                            {/* Кто говорит - подписано словом, а не буквой в кружке:
                                одиночная "О" читалась как ноль и выглядела оценкой. */}
                            {showQuestionTurn && (
                                <div className={`${styles.turn} ${styles.turnAsk}`}>
                                    <span className={styles.turnWho}>Вопрос</span>
                                    <div className={styles.turnBody}>{questionText}</div>
                                </div>
                            )}

                            <div className={styles.turn}>
                                <span className={`${styles.turnWho} ${styles.turnWhoAnswer}`}>Ответ</span>
                                <div className={`${styles.turnBody} ${styles.answerText}`}>{answerText}</div>
                            </div>
                        </div>
                    </div>
                )}

                {score != null && (
                    <div className={styles.sideColumn}>
                        <AdviceSection rules={adviceRules} schemas={metricSchemas} result={result} />
                    </div>
                )}
            </div>

            {score != null && (
                <ExplainSection onExplain={explainSingle} initialExplain={ev.explain}
                                buttonSlot={explainSlot}
                                buttonClassName={`btn btn-sm ${styles.explainAction}`} />
            )}
        </div>
    );
}
