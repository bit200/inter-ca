import React from 'react';
import ScoreBar from '../../EvaluationDetail/components/ScoreBar';
import AdviceSection from '../../EvaluationDetail/components/AdviceSection';
import ExplainSection from '../../EvaluationDetail/components/ExplainSection';
import styles from '../mockInterview.module.scss';
import { STATUS_COLOR } from '../../EvaluationDetail/evaluationStatus';

const STATUS_LABEL = {
    pending: 'Ожидает оценки',
    processing: 'Оценивается...',
    done: 'Оценено',
    error: 'Ошибка оценки',
};

const MockInterviewEvaluationBlock = ({ evaluation, adviceRules, metricSchemas, interviewId, evaluateId }) => {
    const result = evaluation || {};
    const score = result.score;
    const status = evaluation ? 'done' : 'pending';

    const explainDialogTurn = () => global.http.post(
        `/mock-interview/${interviewId}/explain`,
        { evaluateId },
        { wo_notify: true }
    );

    return (
        <div>
            <div className={styles.evaluationSectionTitle}>Оценка ИИ</div>

            {score != null ? (
                <>
                    <div style={{ marginBottom: 20 }} className={'card'}>
                        <ScoreBar score={score} />
                    </div>
                    <AdviceSection rules={adviceRules} schemas={metricSchemas} result={result} />
                    {interviewId != null && evaluateId != null && (
                        <ExplainSection onExplain={explainDialogTurn} />
                    )}
                </>
            ) : (
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
