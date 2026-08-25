import React from 'react';
import ScoreBar from '../../EvaluationDetail/components/ScoreBar';
import AdviceSection from '../../EvaluationDetail/components/AdviceSection';
import ExplainSection from '../../EvaluationDetail/components/ExplainSection';
import styles from '../mockInterview.module.scss';
import { STATUS_COLOR } from '../../EvaluationDetail/evaluationStatus';
import { getQuestionEvaluateStatus } from './evaluateJobState';

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
}) => {
    const result = evaluation || {};
    const score = result.score;
    // evaluateStatus приходит из evaluateState (по конкретному вопросу);
    // фолбэк - для мест, которые статус пока не прокидывают.
    const status = evaluateStatus || getQuestionEvaluateStatus(evaluation, null);

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
