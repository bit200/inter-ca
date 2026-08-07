import React, { useState } from 'react';
import styles from '../mockInterview.module.scss';

const MockInterviewStartCard = ({item, error, onStart}) => {
    const [reserving, setReserving] = useState(false);

    const handleStart = () => {
        setReserving(true);
        onStart().finally(() => setReserving(false));
    };

    return (
        <div className={styles.card}>
            <p className={styles.cardName}>{item.name}</p>
            <div className={styles.cardMeta}>
                <span className={styles.cardMode}>{item.mode || 'live'}</span>
                {item.interviewId && (
                    <span className={styles.cardInterviewId}>
                                {item.interviewId}
                            </span>
                )}
            </div>
            {error && <div className={`alert alert-warning ${styles.cardAlert}`}>{error}</div>}
            <div className={styles.cardBtn}>
                <button
                    className="btn btn-primary btn-sm"
                    onClick={handleStart}
                    disabled={!item.interviewId || reserving}
                >
                    {!item.interviewId && 'Not configured'}
                    {item.interviewId && reserving && 'Проверка...'}
                    {item.interviewId && !reserving && (t('start') || 'Start')}
                </button>
            </div>
        </div>
    );
};

export default MockInterviewStartCard;
