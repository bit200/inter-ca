import React from 'react';
import styles from '../evaluationDetail.module.scss'

function getByPath(obj, path) {
    return path.split('.').reduce((cur, k) => cur != null ? cur[k] : undefined, obj);
}

function groupAdvice(rules, schemas, result) {
    const schemaByKey = {};
    schemas.forEach(s => {
        schemaByKey[s.key] = s;
    });

    // avg_how/avg_why/avg_action are 0 by default when there are no practice
    // examples at all (count === 0) — that's not a real "too abstract" score,
    // so their advice would just contradict the "no examples" advice below.
    const practiceCount = getByPath(result, 'evaluation.practice.count');
    const hasPracticeExamples = practiceCount == null || practiceCount > 0;

    const groups = {};
    rules.forEach(rule => {
        if (!rule.key || rule.from == null || rule.to == null) return;
        if (!hasPracticeExamples && rule.key.startsWith('evaluation.practice.avg_')) return;
        const val = getByPath(result, rule.key);
        if (val == null || typeof val !== 'number') return;
        if (val < rule.from || val > rule.to) return;

        const group = schemaByKey[rule.key]?.group || 'Общее';
        if (!groups[group]) groups[group] = [];
        groups[group].push(rule);
    });
    return groups;
}

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
