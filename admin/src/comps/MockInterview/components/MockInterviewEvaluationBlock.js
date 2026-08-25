import React from 'react';
import ScoreBar from '../../EvaluationDetail/components/ScoreBar';
import AdviceSection from '../../EvaluationDetail/components/AdviceSection';
import ExplainSection from '../../EvaluationDetail/components/ExplainSection';
import styles from '../mockInterview.module.scss';
import { STATUS_COLOR } from '../../EvaluationDetail/evaluationStatus';
import { getQuestionEvaluateStatus, isTextOnlyEvaluate } from './evaluateJobState';

const STATUS_LABEL = {
    pending: 'Ожидает оценки',
    processing: 'Оценивается...',
    done: 'Оценено',
};

const MockInterviewEvaluationBlock = ({
    evaluation,
    adviceRules,
    metricSchemas,
    interviewId,
    evaluateId,
    evaluateExplain,
    evaluateStatus,
    onRetry,
    retrying,
    audioLost,
}) => {
    const result = evaluation || {};
    const score = result.score;
    // evaluateStatus приходит из evaluateState (по конкретному вопросу);
    // фолбэк - для мест, которые статус пока не прокидывают.
    const status = evaluateStatus || getQuestionEvaluateStatus(evaluation, null);
    const textOnly = isTextOnlyEvaluate(result);

    const explainDialogTurn = () => global.http.post(
        `/mock-interview/${interviewId}/explain`,
        { evaluateId },
        { wo_notify: true }
    );

    return (
        <div>
            <div className={styles.evaluationSectionTitle}>Оценка ИИ</div>

            {score != null && (
                <>
                    <div style={{ marginBottom: 20 }} className={'card'}>
                        {textOnly && (
                            <div className={styles.evaluationTextOnlyNote}>
                                Оценка по тексту ответа. Аудио-метрики — темп, паузы, слова-паразиты — не считались.
                            </div>
                        )}
                        <ScoreBar score={score} />
                    </div>
                    <AdviceSection rules={adviceRules} schemas={metricSchemas} result={result} />
                    {interviewId != null && evaluateId != null && (
                        <ExplainSection onExplain={explainDialogTurn} initialExplain={evaluateExplain} />
                    )}
                </>
            )}

            {score == null && status === 'error' && (
                <div className={`card ${styles.evaluationFailed}`}>
                    <div className={'card-body'}>
                        <div className={styles.evaluationFailedLabel}>Без оценки</div>
                        {audioLost ? (
                            <>
                                <div className={styles.evaluationFailedTitle}>Запись ответа не сохранилась</div>
                                <p className={styles.evaluationFailedText}>
                                    Аудио этого ответа не доехало до хранилища, поэтому оценка с записью
                                    упадёт так же. Текст ответа сохранён — по нему можно посчитать оценку
                                    без аудио-метрик: темпа, пауз и слов-паразитов.
                                </p>
                                {onRetry && (
                                    <button
                                        type="button"
                                        className={'btn btn-outline-danger btn-sm'}
                                        onClick={onRetry}
                                        disabled={retrying}
                                    >
                                        {retrying ? 'Отправляем...' : 'Оценить по тексту'}
                                    </button>
                                )}
                            </>
                        ) : (
                            <>
                                <div className={styles.evaluationFailedTitle}>Этот вопрос оценить не удалось</div>
                                <p className={styles.evaluationFailedText}>
                                    Сервис оценки не ответил по этому ответу. Остальные вопросы интервью оценены —
                                    ваш ответ сохранён, его можно отправить на оценку ещё раз.
                                </p>
                                {onRetry && (
                                    <button
                                        type="button"
                                        className={'btn btn-outline-danger btn-sm'}
                                        onClick={onRetry}
                                        disabled={retrying}
                                    >
                                        {retrying ? 'Отправляем...' : 'Оценить ещё раз'}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {score == null && status !== 'error' && (
                <div className={'card'}>
                    <div className={'card-body'}>
                        <div className={styles.evaluationStatus} style={{ color: STATUS_COLOR[status] || STATUS_COLOR.pending }}>
                            {STATUS_LABEL[status] || status}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MockInterviewEvaluationBlock;
