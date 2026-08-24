import React, { useState } from 'react';
import styles from '../evaluationDetail.module.scss'
import MyModal from '../../../libs/MyModal';
import { getScoreRGB } from './scoreColor';
import { getByPath, groupAdvice } from './adviceLogic';

// eval-metric-schemas already carries each key's real scale (min/max) - that's
// the source of truth for normalization. Advice-rule ranges only cover the
// spans someone wrote advice text for (e.g. relevance rules stop at 7.5, not
// the metric's real max of 9), so using them for normalization silently
// shrinks the scale and skews every percent below 100%'s worth of coverage.
function buildMetricRanges(schemas) {
    const ranges = {};
    schemas.forEach(s => {
        if (!s.key || s.min == null || s.max == null) return;
        ranges[s.key] = { min: s.min, max: s.max };
    });
    return ranges;
}

// Every row is displayed as "how good is this parameter" (full green bar = good,
// matching the overall score above it) - but the raw normalized value only means
// that for metrics where higher is better (речь, практика, ...). For a metric
// like is_offtop or errors, the underlying value is "how much of a bad thing",
// so a raw 0 (the best possible outcome) must normalize to 100% ("good"), not
// 0% - and a raw 1 (worst) must read as 0%. metricSchemas don't currently carry
// an explicit direction flag - if the backend schema object ever adds one (e.g.
// `invert`/`lowerIsBetter`), prefer it over this name-based guess. Checked per
// KEY (not per group) because a group can mix directions - "Релевантность" has
// both evaluation.relevance.relevance (higher is better) and
// evaluation.relevance.is_offtop (lower is better); averaging their raw percents
// without inverting is_offtop first previously let is_offtop:1 (worst case)
// contribute 100% to the group average instead of 0%.
function isLowerBetterKey(key, schema) {
    if (schema && typeof schema.invert === 'boolean') return schema.invert;
    if (schema && typeof schema.lowerIsBetter === 'boolean') return schema.lowerIsBetter;
    return /is_offtop|is_critical|\berror|fillers\.count/i.test(key || '');
}

function buildGroupPercents(schemas, result) {
    const ranges = buildMetricRanges(schemas);
    const schemaByKey = {};
    schemas.forEach(s => { schemaByKey[s.key] = s; });

    const groupValues = {};
    const groupAllInverted = {};
    Object.keys(ranges).forEach(key => {
        const val = getByPath(result, key);
        if (val == null || typeof val !== 'number') return;
        const { min, max } = ranges[key];
        if (max <= min) return;
        const rawPct = Math.max(0, Math.min(1, (val - min) / (max - min))) * 100;
        const inverted = isLowerBetterKey(key, schemaByKey[key]);
        // Invert per-key BEFORE averaging into the group, so a mixed-direction
        // group (see comment above) averages "how good", not raw normalized value.
        const pct = inverted ? 100 - rawPct : rawPct;
        const group = schemaByKey[key]?.group || 'Общее';
        (groupValues[group] = groupValues[group] || []).push(pct);
        // Only used for the row label below - a group's label flips to "Без
        // ошибок" only when EVERY metric in it is inverted (e.g. "Ошибки", a
        // single is_critical key), not for a mixed group like "Релевантность"
        // whose already-inverted-and-averaged percent reads correctly as-is.
        if (!(group in groupAllInverted)) groupAllInverted[group] = true;
        groupAllInverted[group] = groupAllInverted[group] && inverted;
    });

    return Object.keys(groupValues).map(group => {
        const pct = Math.round(groupValues[group].reduce((a, b) => a + b, 0) / groupValues[group].length);
        // The percent already reads as "how good", so an all-inverted group's own
        // name ("Ошибки") would read backwards next to it (100% Ошибки = зелёным?!) -
        // flip the label to match what the number actually means. The raw `group`
        // is kept as the row/modal key (adviceByGroup, data-group, ...) so this is
        // display-only.
        const label = groupAllInverted[group] ? 'Без ошибок' : group;
        return { group, label, pct };
    });
}

const AdviceSection = ({ rules, schemas, result }) => {
    const [openGroup, setOpenGroup] = useState(null);

    const rows = buildGroupPercents(schemas, result);
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
                                // 0% - это пустой бар и одинокая цифра сбоку: строка читается
                                // как "тут ничего нет", а не как "тут провал", и теряется среди
                                // соседних. Подсвечиваем саму строку и её название тем же danger,
                                // которым на этой карточке уже помечены критические ошибки.
                                const zero = pct === 0;
                                const rowClasses = [styles.metricRow];
                                if (!clickable) rowClasses.push(styles.metricRowStatic);
                                if (zero) rowClasses.push(styles.metricRowZero);
                                return (
                                    <div key={group}
                                         className={rowClasses.join(' ')}
                                         data-testid="metric-breakdown-row" data-group={group} data-pct={pct}
                                         data-clickable={clickable} data-zero={zero}
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
