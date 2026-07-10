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

    const groups = {};
    rules.forEach(rule => {
        if (!rule.key || rule.from == null || rule.to == null) return;
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

    if (!groupNames.length) {
        return null;
    }

    return (
        <div className={'card'}>
            <div className={`${styles.adviceWrapper} card-body`}>
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
            </div>
        </div>
    );
};

export default AdviceSection;
