import React, { useState } from 'react';
import styles from '../evaluationDetail.module.scss'
import MyModal from '../../../libs/MyModal';
import { getByPath, groupAdvice } from './adviceLogic';

// Advice-rule ranges are the only place this app already knows a metric's
// natural scale (schemas only carry key+group, no explicit max/weight) - so
// each key's overall [min(from), max(to)] across its own rules doubles as
// its 0-100% normalization range here.
function buildMetricRanges(rules) {
    const ranges = {};
    rules.forEach(rule => {
        if (!rule.key || rule.from == null || rule.to == null) return;
        const r = ranges[rule.key] || { min: rule.from, max: rule.to };
        r.min = Math.min(r.min, rule.from);
        r.max = Math.max(r.max, rule.to);
        ranges[rule.key] = r;
    });
    return ranges;
}

function buildGroupPercents(rules, schemas, result) {
    const ranges = buildMetricRanges(rules);
    const schemaByKey = {};
    schemas.forEach(s => { schemaByKey[s.key] = s; });

    const groupValues = {};
    Object.keys(ranges).forEach(key => {
        const val = getByPath(result, key);
        if (val == null || typeof val !== 'number') return;
        const { min, max } = ranges[key];
        if (max <= min) return;
        const pct = Math.round(Math.max(0, Math.min(1, (val - min) / (max - min))) * 100);
        const group = schemaByKey[key]?.group || 'Общее';
        (groupValues[group] = groupValues[group] || []).push(pct);
    });

    return Object.keys(groupValues).map(group => ({
        group,
        pct: Math.round(groupValues[group].reduce((a, b) => a + b, 0) / groupValues[group].length),
    }));
}

const AdviceSection = ({ rules, schemas, result }) => {
    const [openGroup, setOpenGroup] = useState(null);

    const rows = buildGroupPercents(rules, schemas, result);
    // Same rule-matching used to answer "why is this parameter at X%?" in the
    // modal below - computed once here and reused for every row instead of
    // being recomputed per row or duplicated as a separate always-visible list.
    const adviceByGroup = groupAdvice(rules, schemas, result);
    const criticalErrors = result?.evaluation?.errors?.is_critical
        ? (result.evaluation.errors.errors || [])
        : [];

    if (!rows.length && !criticalErrors.length) {
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

                {rows.length > 0 && (
                    <>
                        <div className={styles.adviceTitle}>Детали оценки</div>
                        <div className={styles.metricBreakdown} data-testid="metric-breakdown">
                            {rows.map(({ group, pct }) => {
                                const advice = adviceByGroup[group] || [];
                                const clickable = advice.length > 0;
                                return (
                                    <div key={group}
                                         className={clickable ? styles.metricRow : `${styles.metricRow} ${styles.metricRowStatic}`}
                                         data-testid="metric-breakdown-row" data-group={group} data-pct={pct}
                                         data-clickable={clickable}
                                         onClick={clickable ? () => setOpenGroup(group) : undefined}>
                                        <span className={styles.metricRowLabel}>{group}</span>
                                        <div className={styles.metricRowBar}>
                                            <div style={{ width: `${pct}%` }} />
                                        </div>
                                        <span className={styles.metricRowPct}>{pct}%</span>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {openGroup && (
                    <MyModal isOpen title={openGroup} size="small" onClose={() => setOpenGroup(null)}>
                        <div data-testid="metric-breakdown-modal">
                            <ul className={styles.metricModalList}>
                                {(adviceByGroup[openGroup] || []).map((rule, i) => (
                                    <li key={i}>{rule.advice}</li>
                                ))}
                            </ul>
                        </div>
                    </MyModal>
                )}
            </div>
        </div>
    );
};

export default AdviceSection;
