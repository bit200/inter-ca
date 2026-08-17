import React, { useState } from 'react';
import styles from '../evaluationDetail.module.scss'
import MyModal from '../../../libs/MyModal';
import { getScoreRGB } from './ScoreBar';
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

// Every row is displayed as "how good is this parameter" (full green bar = good,
// matching the overall score above it) - but the raw normalized value only means
// that for metrics where higher is better (речь, практика, ...). For a group like
// "Ошибки", the underlying value is a count/level of errors, so a raw 0 (the best
// possible outcome - no errors) still normalizes to 0% and would render as a red,
// near-empty bar - exactly backwards. metricSchemas don't currently carry an
// explicit direction flag (only key+group are read elsewhere in this file) - if
// the backend schema object ever adds one (e.g. `invert`/`lowerIsBetter`), prefer
// it over this name-based guess. Until then, matching the group label is the only
// signal available client-side for the one confirmed case (errors).
function isLowerBetterGroup(schema, group) {
    if (schema && typeof schema.invert === 'boolean') return schema.invert;
    if (schema && typeof schema.lowerIsBetter === 'boolean') return schema.lowerIsBetter;
    return /ошибк|error/i.test(group || '');
}

function buildGroupPercents(rules, schemas, result) {
    const ranges = buildMetricRanges(rules);
    const schemaByKey = {};
    schemas.forEach(s => { schemaByKey[s.key] = s; });

    const groupValues = {};
    const groupSchema = {};
    Object.keys(ranges).forEach(key => {
        const val = getByPath(result, key);
        if (val == null || typeof val !== 'number') return;
        const { min, max } = ranges[key];
        if (max <= min) return;
        const pct = Math.round(Math.max(0, Math.min(1, (val - min) / (max - min))) * 100);
        const group = schemaByKey[key]?.group || 'Общее';
        groupSchema[group] = groupSchema[group] || schemaByKey[key];
        (groupValues[group] = groupValues[group] || []).push(pct);
    });

    return Object.keys(groupValues).map(group => {
        const avgPct = Math.round(groupValues[group].reduce((a, b) => a + b, 0) / groupValues[group].length);
        const inverted = isLowerBetterGroup(groupSchema[group], group);
        const pct = inverted ? 100 - avgPct : avgPct;
        // The percent already reads as "how good", so an inverted group's own name
        // ("Ошибки") would read backwards next to it (100% Ошибки = зелёным?!) -
        // flip the label to match what the number actually means. The raw `group`
        // is kept as the row/modal key (adviceByGroup, data-group, ...) so this is
        // display-only.
        const label = inverted ? 'Без ошибок' : group;
        return { group, label, pct };
    });
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
                            {rows.map(({ group, label, pct }) => {
                                const advice = adviceByGroup[group] || [];
                                const clickable = advice.length > 0;
                                // Та же красно-жёлто-зелёная шкала, что и у большого балла в
                                // ScoreBar - визуально привязывает "Детали оценки" к оценке сверху.
                                const color = getScoreRGB(pct, 100);
                                return (
                                    <div key={group}
                                         className={clickable ? styles.metricRow : `${styles.metricRow} ${styles.metricRowStatic}`}
                                         data-testid="metric-breakdown-row" data-group={group} data-pct={pct}
                                         data-clickable={clickable}
                                         onClick={clickable ? () => setOpenGroup(group) : undefined}>
                                        <span className={styles.metricRowLabel}>
                                            {label}
                                            {clickable && (
                                                <i className={`iconoir-light-bulb-on ${styles.metricRowHint}`}
                                                   data-testid="metric-breakdown-row-hint"
                                                   title="Есть рекомендация - нажмите, чтобы посмотреть"/>
                                            )}
                                        </span>
                                        <div className={styles.metricRowBar}>
                                            <div style={{ width: `${pct}%`, background: color }} />
                                        </div>
                                        <span className={styles.metricRowPct} style={{ color }}>{pct}%</span>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {openGroup && (
                    <MyModal isOpen title={openGroup} size="lg" onClose={() => setOpenGroup(null)}>
                        <div data-testid="metric-breakdown-modal">
                            <div className={styles.metricModalList}>
                                {(adviceByGroup[openGroup] || []).map((rule, i) => (
                                    <div key={i} className={styles.metricModalItem}>
                                        <span>{rule.advice}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </MyModal>
                )}
            </div>
        </div>
    );
};

export default AdviceSection;
