import React, { useState } from 'react';
import styles from '../mockInterview.module.scss';

const MockInterviewStartCard = ({item, error, busy, onStart}) => {
    const [reserving, setReserving] = useState(false);

    const handleStart = () => {
        setReserving(true);
        onStart().finally(() => setReserving(false));
    };

    return (
        <div className={styles.card} data-testid="mock-interview-start-card" data-busy={busy || undefined}>
            <p className={styles.cardName}>
                {item.name}
                {busy && <i className="iconoir-lock" data-testid="mock-interview-busy-lock" title="Бот сейчас занят"/>}
            </p>
            <div className={styles.cardMeta}>
                <span className={styles.cardMode}>{item.mode || 'live'}</span>
                {item.interviewId && (
                    <span className={styles.cardInterviewId}>
                                {item.interviewId}
                            </span>
                )}
            </div>
            {error && !busy && <div className={`alert alert-warning ${styles.cardAlert}`} data-testid="mock-interview-start-error">{error}</div>}
            {busy && (
                <div className={`alert alert-warning ${styles.cardAlert}`} data-testid="mock-interview-start-error">
                    <i className="iconoir-lock"/> {error}
                </div>
            )}
            <div className={styles.cardBtn}>
                <button
                    className={`btn btn-sm ${busy ? 'btn-outline-secondary' : 'btn-primary'}`}
                    data-testid="mock-interview-start-button"
                    onClick={handleStart}
                    disabled={!item.interviewId || reserving}
                >
                    {!item.interviewId && 'Not configured'}
                    {item.interviewId && reserving && 'Проверка...'}
                    {item.interviewId && !reserving && busy && (<><i className="iconoir-lock"/> Проверить снова</>)}
                    {item.interviewId && !reserving && !busy && (t('continue') || 'Продолжить')}
                </button>
            </div>
        </div>
    );
};

export default MockInterviewStartCard;
