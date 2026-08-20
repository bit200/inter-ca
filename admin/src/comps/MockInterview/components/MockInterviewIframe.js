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
// если закрыть оверлей в этот момент, звук обрывается на середине. Даём паузу,
// чтобы бот успел договорить.
const FINISH_DELAY_MS = 5000;

const MockInterviewIframe = ({ interview, onClose, onComplete }) => {
    const embedOrigin = useMemo(() => embedOriginOf(interview.embedUrl), [interview.embedUrl]);
    const finishTimeoutRef = useRef(null);

    useEffect(() => {
        return () => clearTimeout(finishTimeoutRef.current);
    }, []);

    useEffect(() => {
        const completeWithDelay = () => {
            clearTimeout(finishTimeoutRef.current);
            finishTimeoutRef.current = setTimeout(onComplete, FINISH_DELAY_MS);
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
                    completeWithDelay();
                    return;
                }

                window.notify.error('Произошла ошибка');
                return;
            }

            if (msg.type === 'itk.interview.session_closed') {
                const status = msg.payload?.status;
                if (status === 'completed') {
                    completeWithDelay();
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
