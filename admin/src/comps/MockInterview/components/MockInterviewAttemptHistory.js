import React from 'react';
import styles from '../mockInterview.module.scss';
import { attemptScoreSummary } from './evaluateJobState';

const PASSED_STATUSES = ['completed', 'evaluated'];

const STATUS_LABEL = {
    draft: 'Ожидает',
    active: 'Ожидает',
    started: 'Начато',
    completed: 'Завершено',
    evaluated: 'Завершено',
};

// Балл попытки агрегируем сами: отдельного поля с итогом на попытке нет
// (см. mockInterview.md), а часть вопросов может остаться без оценки, если
// сервис оценки упал по ним - тогда средний балл считается по оставшимся,
// и сколько их было, показываем строкой рядом (см. attemptScoreSummary).

const MockInterviewAttemptHistory = ({ history, currentItem, latestCompleted, retaking, onRetake }) => {
    // Список прошлых попыток показываем только когда их реально больше одной -
    // сама первая попытка и так видна как основной экран выше. Кнопка "Пройти
    // заново" от этого не зависит: она нужна уже после самой первой завершённой
    // попытки, до появления какой-либо "истории".
    const showList = history.length > 1;
    if (!showList && !latestCompleted) {
        return null;
    }

    return (
        <div className="card" style={{ marginBottom: 20 }}>
            <div className={`card-body ${styles.cardBody}`}>
                {showList && (
                    <>
                        <p className={styles.cardName}>{t('attemptHistory') || 'История попыток'}</p>
                        <div className={styles.list}>
                            {history.map((attempt, ind) => {
                                const passed = PASSED_STATUSES.includes(attempt.status);
                                const { score, scored, total } = passed
                                    ? attemptScoreSummary(attempt)
                                    : { score: null, scored: 0, total: 0 };
                                const partial = score != null && total > 0 && scored < total;
                                const isCurrent = attempt._id === currentItem._id;
                                return (
                                    <div key={attempt._id} className="card" data-testid="mock-interview-attempt-row">
                                        <div className={`card-body ${styles.cardBody}`}>
                                            <div className={styles.cardMeta}>
                                                <span>{(t('attemptNumber') || 'Попытка') + ' ' + (attempt.attemptNumber || (history.length - ind))}</span>
                                                {isCurrent && <span className={styles.cardMode}>{t('currentAttempt') || 'Текущая'}</span>}
                                            </div>
                                            <div className={styles.cardMeta}>
                                                <span>{STATUS_LABEL[attempt.status] || attempt.status}</span>
                                                {attempt.cd && <span>{new Date(attempt.cd).toLocaleString('ru')}</span>}
                                            </div>
                                            {score != null && <div>{'Балл: ' + score + '/10'}</div>}
                                            {partial && (
                                                <div className={styles.cardScoreNote}>
                                                    {'Оценено ' + scored + ' из ' + total + ' вопросов'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
                {latestCompleted && (
                    <div className={styles.cardBtn}>
                        <button
                            className="btn btn-primary btn-sm"
                            data-testid="mock-interview-retake-button"
                            onClick={onRetake}
                            disabled={retaking}
                        >
                            {retaking ? 'Проверка...' : (t('retakeMockInterview') || 'Пройти заново')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MockInterviewAttemptHistory;
