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
    const autoStartedRef = useRef(false);

    useEffect(() => {
        global.http.get(`/mock-interview/my-list/${getIdFromUrl()}`).then(setItem);
    }, []);

    const isPassed = !!item && (PASSED_STATUSES.includes(item.status) || completedLocally);

    const startAttempt = (attemptItem) => {
        return global.http.post(`/mock-interview/my-list/${attemptItem._id}/reserve`, {}, { wo_notify: true })
            .then(() => setActive(attemptItem))
            .catch(e => {
                const message = e?.error === 'busy'
                    ? 'Сервис интервью сейчас занят другим пользователем. Попробуйте открыть позже.'
                    : 'Не удалось забронировать интервью. Попробуйте ещё раз.';
                global.notify.warning(message);
            });
    };

    useEffect(() => {
        if (item && item.interviewId && !isPassed && !autoStartedRef.current) {
            autoStartedRef.current = true;
            startAttempt(item);
        }
    }, [item, isPassed]);

    const handleComplete = () => {
        setActive(null);
        setCompletedLocally(true);
    };

    const handleCloseIframe = () => {
        global.http.post(`/mock-interview/my-list/${item._id}/release`, {}, { wo_notify: true }).catch(() => {});
        setActive(null);
    };

    //todo use loader from project
    if (!item) {
        return <div className={styles.container}>Loading...</div>;
    }

    return (
        <>
            {isPassed && <MockInterviewResults interview={item}/>}
            {!isPassed && <MockInterviewStartCard item={item} onStart={() => startAttempt(item)}/>}
            {active && <MockInterviewIframe
                interview={active}
                onClose={handleCloseIframe}
                onComplete={handleComplete}/>
            }
        </>
    );
}

export default MockInterview;
