import React from 'react';
import ScoreBar from '../../EvaluationDetail/components/ScoreBar';
import AdviceSection from '../../EvaluationDetail/components/AdviceSection';
import styles from '../mockInterview.module.scss';

const STATUS_LABEL = {
    pending: 'Ожидает оценки',
    processing: 'Оценивается...',
    done: 'Оценено',
    error: 'Ошибка оценки',
};

const STATUS_COLOR = {
    pending: '#999',
    processing: '#f0a500',
    done: '#2a9d2a',
    error: '#cc3333',
};

const MockInterviewEvaluationBlock = ({ evaluation, adviceRules, metricSchemas }) => {
    const result = evaluation || {};
    const score = result.score;
    const status = evaluation ? 'done' : 'pending';

    return (
        <div>
            <div className={styles.evaluationSectionTitle}>Оценка ИИ</div>

            {score != null ? (
                <>
                    <div style={{ marginBottom: 20 }} className={'card'}>
                        <ScoreBar score={score} />
                    </div>
                    <AdviceSection rules={adviceRules} schemas={metricSchemas} result={result} />
                </>
            ) : (
                <div className={'card'}>
                    <div className={'card-body'}>
                        <div className={styles.evaluationStatus} style={{ color: STATUS_COLOR[status] || '#999' }}>
                            {STATUS_LABEL[status] || status}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MockInterviewEvaluationBlock;
