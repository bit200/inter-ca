import React from 'react';
import styles from '../mockInterview.module.scss';
import { attemptScoreSummary } from './evaluateJobState';
import { isAttemptFinished, attemptStatusLabel } from './attemptStatus';

// Завершённая попытка без единой оценки: раньше про это писала отдельная
// карточка-заглушка над историей (MockInterviewResults), оторванная от самой
// попытки. Теперь строка стоит там же, где у остальных попыток стоит балл.
const NO_RESULTS_NOTE = 'Результаты пока недоступны';

// Балл попытки агрегируем сами: отдельного поля с итогом на попытке нет
// (см. mockInterview.md), а часть вопросов может остаться без оценки, если
// сервис оценки упал по ним - тогда средний балл считается по оставшимся,
// и сколько их было, показываем строкой рядом (см. attemptScoreSummary).

// Незавершённая попытка (её видно в списке как "Начато"/"Ожидает") - это не
// тупик: бот по ней ещё ждёт, и её надо дать открыть заново. Кнопка стоит
// только у чужих строк списка: для текущей попытки то же самое делает большая
// карточка старта над историей, второй кнопки там не нужно. Попытку, застрявшую
// в статусе "Начато" с уже готовым диалогом, продолжать нечего - она считается
// завершённой (см. isAttemptFinished).

// Завершённая попытка из списка - это готовая оценка, но открыть её было
// нечем: экран показывал результаты только той попытки, что пришла в
// attemptId, и вернуться к прошлой можно было разве что через адресную строку.
// Кнопка переводит экран результатов на выбранную попытку (см. onOpenResults
// в MockInterviewCore). У текущей попытки её нет - её результаты и так выше.

const MockInterviewAttemptHistory = ({ history, currentItem, latestCompleted, retaking, onRetake, onContinue, onOpenResults }) => {
    // Список прошлых попыток показываем только когда их реально больше одной -
    // сама первая попытка и так видна как основной экран выше. Кнопка "Пройти
    // заново" от этого не зависит: она нужна уже после самой первой завершённой
    // попытки, до появления какой-либо "истории".
    const showList = history.length > 1;
    if (!showList && !latestCompleted) {
        return null;
    }

    // Позиция текущей попытки в списке: history отсортирована свежими вперёд,
    // а человеку привычнее счёт от первой попытки к последней.
    const currentIndex = history.findIndex(attempt => attempt._id === currentItem._id);
    const currentPosition = currentIndex === -1 ? 0 : history.length - currentIndex;

    // Единственная попытка списком не показывается - но сказать, что результатов
    // по ней ещё нет, всё равно надо: строку ставим над кнопкой "Пройти заново".
    const soloWithoutResults = !showList
        && isAttemptFinished(currentItem)
        && attemptScoreSummary(currentItem).score == null;

    return (
        <div className="card" style={{ marginBottom: 20 }}>
            <div className={`card-body ${styles.cardBody}`}>
                {showList && (
                    <>
                        <p className={styles.cardName}>{currentItem.name || (t('attemptHistory') || 'История попыток')}</p>
                        <p className={styles.attemptCounter} data-testid="mock-interview-attempt-counter">
                            {'Попытка ' + (currentPosition || 1) + ' из ' + history.length
                                + ' \u2014 результаты любой из них открываются кнопкой в её карточке'}
                        </p>
                        <div className={styles.list}>
                            {history.map((attempt, ind) => {
                                const passed = isAttemptFinished(attempt);
                                const { score, scored, total } = passed
                                    ? attemptScoreSummary(attempt)
                                    : { score: null, scored: 0, total: 0 };
                                const partial = score != null && total > 0 && scored < total;
                                const isCurrent = attempt._id === currentItem._id;
                                const canContinue = !isCurrent && !!onContinue && !passed;
                                const canOpenResults = !isCurrent && !!onOpenResults && passed;
                                return (
                                    <div
                                        key={attempt._id}
                                        className={`card ${styles.attemptCard} ${isCurrent ? styles.attemptCardCurrent : ''}`}
                                        data-testid="mock-interview-attempt-row"
                                    >
                                        <div className={`card-body ${styles.cardBody}`}>
                                            <div className={styles.cardMeta}>
                                                <span className={styles.attemptTitle}>{(t('attemptNumber') || 'Попытка') + ' ' + (attempt.attemptNumber || (history.length - ind))}</span>
                                                {isCurrent && <span className={styles.cardMode}>{t('currentAttempt') || 'Текущая'}</span>}
                                            </div>
                                            <div className={styles.cardMeta}>
                                                <span className={canContinue ? styles.cardStatusUnfinished : undefined}>
                                                    {attemptStatusLabel(attempt)}
                                                </span>
                                                {attempt.cd && <span>{new Date(attempt.cd).toLocaleString('ru')}</span>}
                                            </div>
                                            {score != null && <div className={styles.attemptScore}>{'Балл: ' + score + '/10'}</div>}
                                            {partial && (
                                                <div className={styles.cardScoreNote}>
                                                    {'Оценено ' + scored + ' из ' + total + ' вопросов'}
                                                </div>
                                            )}
                                            {passed && score == null && (
                                                <div className={styles.cardScoreNote}>{NO_RESULTS_NOTE}</div>
                                            )}
                                            {(canContinue || canOpenResults) && (
                                                <div className={styles.cardBtn}>
                                                    {canContinue && (
                                                        <button
                                                            className="btn btn-outline-primary btn-sm"
                                                            data-testid="mock-interview-continue-button"
                                                            onClick={() => onContinue(attempt)}
                                                        >
                                                            {t('continueMockInterview') || 'Продолжить'}
                                                        </button>
                                                    )}
                                                    {canOpenResults && (
                                                        <button
                                                            className="btn btn-outline-secondary btn-sm"
                                                            data-testid="mock-interview-results-button"
                                                            onClick={() => onOpenResults(attempt)}
                                                        >
                                                            {t('openAttemptResults') || 'Смотреть результаты'}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
                {soloWithoutResults && (
                    <div className={styles.cardScoreNote}>{NO_RESULTS_NOTE}</div>
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
