import React from 'react';
import styles from '../evaluationDetail.module.scss';
import { getByPath } from './adviceLogic';

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

const MetricBreakdown = ({ rules, schemas, result }) => {
    const rows = buildGroupPercents(rules, schemas, result);
    if (!rows.length) return null;

    return (
        <div className={styles.metricBreakdown} data-testid="metric-breakdown">
            {rows.map(({ group, pct }) => (
                <div key={group} className={styles.metricRow} data-testid="metric-breakdown-row" data-group={group} data-pct={pct}>
                    <span className={styles.metricRowLabel}>{group}</span>
                    <div className={styles.metricRowBar}>
                        <div style={{ width: `${pct}%` }} />
                    </div>
                    <span className={styles.metricRowPct}>{pct}%</span>
                </div>
            ))}
        </div>
    );
};

export default MetricBreakdown;
