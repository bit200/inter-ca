import React, { useEffect, useRef, useState } from 'react';
import styles from './mockInterview.module.scss';

const PASSED_STATUSES = ['completed', 'evaluated'];

function buildIframeUrl(interview) {
    const userId = (global.user.get_info() || {})._id || 'guest';
    const base = window.env.mock_interview_domain;
    const params = new URLSearchParams({
        interview_id: interview.interviewId,
        user_id: String(userId),
        mode: interview.mode || 'live',
        title: interview.name || '',
    });
    // резюмируем уже начатую сессию вместо того, чтобы каждый реопен/reload
    // страницы создавал на стороне бота новую (session_id есть — force_new
    // выставляться не будет, см. useInterviewSession.js в itk-live)
    if (interview.sessionId) {
        params.set('session_id', interview.sessionId);
    }
    return `${base}/embed/interview?${params}`;
}

function MockInterviewResults({ interview }) {
    return (
        <div className={styles.card}>
            <p className={styles.cardName}>{interview.name}</p>
            <div className={styles.noInfo}>Результаты пока недоступны</div>
        </div>
    );
}

function IframeModal({ interview, onClose, onComplete }) {
    const iframeRef = useRef(null);
    const savedSessionIdRef = useRef(null);

    const sendCommand = (type) => {
        iframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({ type }),
            window.env.mock_interview_domain
        );
    };

    const saveSessionId = (sessionId) => {
        if (!sessionId || sessionId === savedSessionIdRef.current) return;
        savedSessionIdRef.current = sessionId;
        global.http.put(`/mock-interview/my-list/${interview._id}`, { sessionId, status: 'started' });
    };

    useEffect(() => {
        const handler = (e) => {

            //пропускаем ненужные сообщение от других источников
            if (e.origin !== window.env.mock_interview_domain) {
                return;
            }

            let msg;
            try {
                msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data ?? {};
            } catch (_) {
                return;
            }

            // недокументированный служебный канал (диагностика), но самый
            // ранний и надёжный источник sessionId по факту наблюдений
            if (msg.source === 'itk-live-embed' && msg.type === 'itk.interview.state') {
                saveSessionId(msg.payload?.sessionId);
                return;
            }

            if (msg.source === 'itk-live-embed' && msg.type === 'itk.interview.completed') {
                setTimeout(() => {
                    const sessionId = msg.payload?.sessionId || savedSessionIdRef.current;
                    savedSessionIdRef.current = sessionId;
                    global.http.put(`/mock-interview/my-list/${interview._id}`, { sessionId, status: 'completed' });
                    onComplete();
                }, 5000)

                return;
            }

            if (msg.type === 'itk_interview_ready') {
                sendCommand('start');
            }
            if (msg.type === 'itk_interview_error') {
                // todo добавить логику временного сохранения логов ошибок
                window.notify.error("Произошла ошибка")
                console.error(msg, e)
            }
            else if (msg.type === 'itk_interview_finished') {
                const sessionId = savedSessionIdRef.current || msg.session_id;
                savedSessionIdRef.current = sessionId;
                global.http.put(`/mock-interview/my-list/${interview._id}`, { sessionId, status: 'completed' });
                onClose();
            }
            else if (msg.type === 'itk_interview_closed') {
                onClose();
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, [onClose, onComplete]);

    const handleManualClose = () => {
        sendCommand('stop');
        onClose();
    };

    return (
        <div className={styles.iframeOverlay}>
            {/*<div className={styles.iframeHeader}>*/}
            {/*    <span>{interview.name}</span>*/}
            {/*    <button className={styles.iframeClose} onClick={handleManualClose}>✕</button>*/}
            {/*</div>*/}
            <div className={styles.iframeWrap}>
                <iframe
                    ref={iframeRef}
                    src={buildIframeUrl(interview)}
                    allow="microphone; camera"
                    title={interview.name}
                />
            </div>
        </div>
    );
}

function getIdFromUrl() {
    const parts = window.location.pathname.split('/');
    return parts[parts.length - 1];
}

function MockInterview() {
    const [item, setItem] = useState(null);
    const [active, setActive] = useState(null);
    const [completedLocally, setCompletedLocally] = useState(false);

    useEffect(() => {
        global.http.get(`/mock-interview/my-list/${getIdFromUrl()}`).then(setItem);
    }, []);

    const isPassed = !!item && (PASSED_STATUSES.includes(item.status) || completedLocally);

    useEffect(() => {
        if (item && item.interviewId && !isPassed) {
            setActive(item);
        }
    }, [item, isPassed]);

    const handleComplete = () => {
        setActive(null);
        setCompletedLocally(true);
    };

    if (!item) {
        return <div className={styles.container}>Loading...</div>;
    }

    return (
        <div className={`${styles.container} row`}>
            {isPassed ? (
                <MockInterviewResults interview={item} />
            ) : (
                <div className={styles.card}>
                    <p className={styles.cardName}>{item.name}</p>
                    <div className={styles.cardMeta}>
                        <span className={styles.cardMode}>{item.mode || 'live'}</span>
                        {item.interviewId && (
                            <span style={{ fontFamily: 'monospace', fontSize: 11 }}>
                                {item.interviewId.slice(0, 30)}…
                            </span>
                        )}
                    </div>
                    <div className={styles.cardBtn}>
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={() => setActive(item)}
                            disabled={!item.interviewId}
                        >
                            {item.interviewId ? (t('start') || 'Start') : 'Not configured'}
                        </button>
                    </div>
                </div>
            )}

            {active && (
                <IframeModal interview={active} onClose={() => setActive(null)} onComplete={handleComplete} />
            )}
        </div>
    );
}

export default MockInterview;
