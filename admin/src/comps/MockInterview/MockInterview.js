import React, {useEffect, useRef, useState} from 'react';
import styles from './mockInterview.module.scss';
import MockInterviewIframe from "./components/MockInterviewIframe";
import MockInterviewResults from "./components/MockInterviewResults";
import MockInterviewStartCard from "./components/MockInterviewStartCard";

const PASSED_STATUSES = ['completed', 'evaluated'];

function getIdFromUrl() {
    const parts = window.location.pathname.split('/');
    return parts[parts.length - 1];
}

function MockInterview() {
    const [item, setItem] = useState(null);
    const [active, setActive] = useState(null);
    const [completedLocally, setCompletedLocally] = useState(false);
    const [startError, setStartError] = useState(null);
    const autoStartedRef = useRef(false);
    const reservedRef = useRef(false);
    const itemRef = useRef(null);
    itemRef.current = item;

    useEffect(() => {
        global.http.get(`/mock-interview/my-list/${getIdFromUrl()}`).then(setItem);
    }, []);

    const isPassed = !!item && (PASSED_STATUSES.includes(item.status) || completedLocally);

    // releaseReservation прогоняем через обычный http (переживает SPA-навигацию),
    // releaseReservationOnUnload — через fetch(keepalive), т.к. это единственный способ
    // пронести Authorization-заголовок и не потерять запрос при закрытии вкладки/reload
    // (navigator.sendBeacon кастомные заголовки не поддерживает).
    const releaseReservation = () => {
        if (!reservedRef.current || !itemRef.current) return;
        reservedRef.current = false;
        global.http.post(`/mock-interview/my-list/${itemRef.current._id}/release`, {}, { wo_notify: true }).catch(() => {});
    };

    const releaseReservationOnUnload = () => {
        if (!reservedRef.current || !itemRef.current) return;
        reservedRef.current = false;
        try {
            fetch(`${window.env.domain}/api/mock-interview/my-list/${itemRef.current._id}/release`, {
                method: 'POST',
                keepalive: true,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': global.user.get_token(),
                },
                body: '{}',
            }).catch(() => {});
        } catch (e) {}
    };

    useEffect(() => {
        window.addEventListener('pagehide', releaseReservationOnUnload);
        return () => {
            window.removeEventListener('pagehide', releaseReservationOnUnload);
            releaseReservation();
        };
    }, []);

    // Бэкенд создаёт одноразовый embed_url через issuer-токен ITK_EMBED_API_KEY
    // (см. docs/contracts/embed-interview-iframe.md в itk-live) — сам токен
    // на фронт никогда не попадает, iframe открывается сразу на готовый embed_url.
    const startAttempt = (attemptItem) => {
        setStartError(null);
        return global.http.post(`/mock-interview/my-list/${attemptItem._id}/reserve`, {}, { wo_notify: true })
            .then(() => {
                reservedRef.current = true;
                return global.http.post(`/mock-interview/my-list/${attemptItem._id}/embed-session`, {
                    parentOrigin: window.location.origin,
                }, { wo_notify: true });
            })
            .then((session) => {
                global.http.put(`/mock-interview/my-list/${attemptItem._id}`, {
                    sessionId: session.sessionId,
                    status: 'started',
                }, { wo_notify: true });
                setActive({ ...attemptItem, embedUrl: session.embedUrl, sessionId: session.sessionId });
            })
            .catch(e => {
                if (reservedRef.current) {
                    releaseReservation();
                }
                const message = e?.error === 'busy'
                    ? 'Интервью сейчас занято другим пользователем. Попробуйте открыть позже.'
                    : 'Не удалось забронировать интервью. Попробуйте ещё раз.';
                global.notify.warning(message);
                setStartError(message);
            });
    };

    useEffect(() => {
        if (item && item.interviewId && !isPassed && !autoStartedRef.current) {
            autoStartedRef.current = true;
            startAttempt(item);
        }
    }, [item, isPassed]);

    const handleComplete = () => {
        releaseReservation();
        global.http.put(`/mock-interview/my-list/${itemRef.current._id}`, { status: 'completed' }, { wo_notify: true }).catch(() => {});
        setItem(prev => ({ ...prev, status: 'completed' }));
        setActive(null);
        setCompletedLocally(true);
    };

    const handleCloseIframe = () => {
        releaseReservation();
        setActive(null);
    };

    //todo use loader from project
    if (!item) {
        return <div className={styles.container}>Loading...</div>;
    }

    return (
        <>
            {isPassed && <MockInterviewResults interview={item}/>}
            {!isPassed && <MockInterviewStartCard item={item} error={startError} onStart={() => startAttempt(item)}/>}
            {active && <MockInterviewIframe
                interview={active}
                onClose={handleCloseIframe}
                onComplete={handleComplete}/>
            }
        </>
    );
}

export default MockInterview;
