import React, {useEffect, useMemo, useRef} from 'react';
import {createPortal} from 'react-dom';
import styles from '../mockInterview.module.scss';

// см. docs/contracts/embed-interview-iframe.md в itk-live: iframe открывается
// сразу на одноразовый interview.embedUrl (его выдал наш бэкенд), поэтому
// origin для проверки postMessage и для команд в iframe берём из самого embedUrl,
// а не из отдельного env-конфига.
function embedOriginOf(embedUrl) {
    try {
        return new URL(embedUrl).origin;
    } catch (e) {
        return '';
    }
}

// itk-live закрывает сессию на сервере (и шлёт нам сигнал завершения) сразу как
// готов финальный фидбек, не дожидаясь пока доиграет прощальная реплика бота —
// если закрыть оверлей в этот момент, звук обрывается на середине. Раньше здесь
// была слепая пауза в 5с; вместо гадания слушаем itk.interview.state.aiPlaying
// (см. itk-live/services/web-ui/.../useEmbedRuntimeEvents.js - тот же флаг,
// которым runtime показывает "ИИ говорит") и закрываем оверлей, как только
// проигрывание реально закончилось. FINISH_FALLBACK_MS - страховка на случай,
// если state-событие с aiPlaying:false почему-то не придёт.
const FINISH_FALLBACK_MS = 8000;

const MockInterviewIframe = ({ interview, onClose, onComplete }) => {
    const embedOrigin = useMemo(() => embedOriginOf(interview.embedUrl), [interview.embedUrl]);
    const finishTimeoutRef = useRef(null);
    const aiPlayingRef = useRef(false);
    const awaitingFinishRef = useRef(false);

    useEffect(() => {
        return () => clearTimeout(finishTimeoutRef.current);
    }, []);

    useEffect(() => {
        const finishNow = () => {
            clearTimeout(finishTimeoutRef.current);
            awaitingFinishRef.current = false;
            onComplete();
        };

        const scheduleFinish = () => {
            awaitingFinishRef.current = true;
            if (!aiPlayingRef.current) {
                finishNow();
                return;
            }
            clearTimeout(finishTimeoutRef.current);
            finishTimeoutRef.current = setTimeout(finishNow, FINISH_FALLBACK_MS);
        };

        const handler = (e) => {
            if (!embedOrigin || e.origin !== embedOrigin) {
                return;
            }

            let msg;
            try {
                msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data ?? {};
            } catch (_) {
                return;
            }

            if (msg.source !== 'itk-live-embed') {
                return;
            }

            if (msg.type === 'itk.interview.state') {
                aiPlayingRef.current = !!msg.payload?.aiPlaying;
                if (awaitingFinishRef.current && !aiPlayingRef.current) {
                    finishNow();
                }
                return;
            }

            if (msg.type === 'itk.interview.error') {
                // todo добавить логику временного сохранения логов ошибок
                console.error(msg, e);

                // itk-live отзывает доступ сразу при закрытии сессии (см. контракт),
                // поэтому периодический heartbeat, успевший прилететь уже после
                // естественного завершения интервью, получает 401 вместо статуса
                // completed — и itk.interview.session_closed в этом случае вообще
                // не приходит (баг на их стороне: closeSession('completed') не шлёт
                // postMessage напрямую). Трактуем такую ошибку как сигнал, что
                // интервью уже завершилось, и переводим кандидата на экран
                // результатов сами, а не оставляем его смотреть на мёртвый iframe.
                const isStaleHeartbeat = msg.payload?.stage === 'heartbeat'
                    && /invalid authorization/i.test(msg.payload?.error || '');
                if (isStaleHeartbeat) {
                    scheduleFinish();
                    return;
                }

                window.notify.error('Произошла ошибка');
                return;
            }

            if (msg.type === 'itk.interview.session_closed') {
                const status = msg.payload?.status;
                // Своей кнопки "Выйти" в шапке оверлея больше нет - выходят той,
                // что рисует сам itk-live внутри iframe (было две одинаковых на
                // одном экране). Её нажатие приходит сюда тем же session_closed,
                // поэтому логику прежней кнопки переносим сюда: если финал уже
                // объявлен и мы лишь ждём, пока бот доиграет прощание, выход
                // пользователя это ожидание обрывает и завершает попытку сразу.
                if (awaitingFinishRef.current) {
                    finishNow();
                    return;
                }
                if (status === 'completed') {
                    scheduleFinish();
                } else {
                    onClose();
                }
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, [embedOrigin, onClose, onComplete]);

    // Портал в body - иначе при старте из таба CourseQuiz (встроен в MyModal)
    // оверлей остаётся зажат в DOM-поддереве модалки вместо настоящего
    // полноэкранного вида, как на отдельной странице /mock-interviews/:id.
    return createPortal((
        <div className={styles.iframeOverlay} data-testid="mock-interview-overlay">
            <div className={styles.iframeHeader}>
                <span>{interview.name}</span>
            </div>
            <div className={styles.iframeWrap}>
                <iframe
                    src={interview.embedUrl}
                    allow="microphone; autoplay"
                    referrerPolicy="no-referrer"
                    title={interview.name}
                    data-testid="mock-interview-embed-frame"
                />
            </div>
        </div>
    ), document.body);
};

export default MockInterviewIframe;
