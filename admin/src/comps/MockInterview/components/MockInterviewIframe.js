import React, {useEffect, useRef} from 'react';
import styles from '../mockInterview.module.scss';

function buildIframeUrl(interview) {
    const userId = (global.user.get_info() || {})._id || 'guest';
    const base = window.env.mock_interview_domain;
    const params = new URLSearchParams({
        interview_id: interview.interviewId,
        user_id: String(userId),
        mode: interview.mode || 'chat',
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

const MockInterviewIframe = ({ interview, onClose, onComplete }) => {
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

            console.log('LOOOG event', e);

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
                console.log('LOOOG', 'HREREE');
                setTimeout(() => {
                    const sessionId = msg.payload?.sessionId || savedSessionIdRef.current;
                    savedSessionIdRef.current = sessionId;
                    global.http.put(`/mock-interview/my-list/${interview._id}`, { sessionId, status: 'completed' });
                    onComplete();
                }, 1000)

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
                console.log('LOOOG', 'FINISHHH');
                const sessionId = savedSessionIdRef.current || msg.session_id;
                savedSessionIdRef.current = sessionId;
                global.http.put(`/mock-interview/my-list/${interview._id}`, { sessionId, status: 'completed' });
                onClose();
            }
            else if (msg.type === 'itk_interview_closed') {
                console.log('LOOOG', 'CLOSED');
                onClose();
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, [onClose, onComplete]);


    return (
        <div className={styles.iframeOverlay}>
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
};

export default MockInterviewIframe;
