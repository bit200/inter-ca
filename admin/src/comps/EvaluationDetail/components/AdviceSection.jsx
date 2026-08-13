import React from 'react';
import styles from '../evaluationDetail.module.scss'
import { groupAdvice } from './adviceLogic';

const AdviceSection = ({ rules, schemas, result }) => {
    const groups = groupAdvice(rules, schemas, result);
    const groupNames = Object.keys(groups);
    const criticalErrors = result?.evaluation?.errors?.is_critical
        ? (result.evaluation.errors.errors || [])
        : [];

    if (!groupNames.length && !criticalErrors.length) {
        return null;
    }

    return (
        <div className={'card'}>
            <div className={`${styles.adviceWrapper} card-body`}>
                {criticalErrors.length > 0 && (
                    <div className={styles.criticalErrors}>
                        <div className={styles.criticalErrorsTitle}>Критическая ошибка</div>
                        <div className={styles.criticalErrorsList}>
                            {criticalErrors.map((error, i) => (
                                <div key={i} className={styles.criticalErrorItem}>
                                    <span>{error}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {groupNames.length > 0 && (
                    <>
                        <div className={styles.adviceTitle}>Как улучшить ответ:</div>
                        <div className={styles.adviceList}>
                            {groupNames.map(group => (
                                <div key={group}>
                                    <div className={styles.adviceGroupTitle}>
                                        {group}
                                    </div>
                                    <div className={styles.adviceGroupList}>
                                        {groups[group].map((rule, i) => (
                                            <div key={i} className={styles.adviceGroupItem}>
                                                <span>{rule.advice}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default AdviceSection;
