import React, { useState } from 'react';

import styles from '../evaluationDetail.module.scss';
import MyModal from '../../../libs/MyModal';
import MetricChip from './MetricChip';
import { formatScore } from './formatScore';
import { groupAdvice } from './adviceLogic';
import { buildGroupPercents } from './metricGroups';

// Группа схемы метрик, в которой лежит сам итоговый балл (key: 'score',
// см. eval-metric-schemas). Её чип показывал ровно то же число, что и "Общая
// оценка" рядом, - двух подписей на одну цифру в линейке быть не должно.
// Поэтому группа своего чипа не получает: её процент и рекомендации целиком
// уходят в чип общей оценки, и клик по нему открывает ту же модалку.
export const OVERALL_GROUP = 'Итог';

// Линейка оценки под шапкой. Раньше здесь стояла полоса-термометр во всю
// ширину, а показатели - мелкими чипами под ней: два разных способа показать
// одно и то же, и общий балл выбивался из строя. Теперь общая оценка - такой
// же чип, только первый и с заливкой: вся оценка ответа читается одной строкой
// в одном стиле.
const ScoreStrip = ({ score, max = 10, rules = [], schemas = [], result = {} }) => {
    const [openGroup, setOpenGroup] = useState(null);

    const rows = buildGroupPercents(schemas, result).filter(({ group }) => group !== OVERALL_GROUP);
    const adviceByGroup = groupAdvice(rules, schemas, result);
    const overallAdvice = adviceByGroup[OVERALL_GROUP] || [];

    if (score == null && !rows.length) return null;

    return (
        <div className={styles.strip} data-testid="evaluation-strip">
            {score != null && (
                <MetricChip lead label="Общая оценка" value={formatScore(score)} suffix={`/${max}`}
                            pct={score} max={max}
                            clickable={overallAdvice.length > 0} hint={overallAdvice.length > 0}
                            onClick={() => setOpenGroup(OVERALL_GROUP)}
                            data-testid="evaluate-score" data-score={score}/>
            )}

            {rows.map(({ group, label, pct }) => {
                const advice = adviceByGroup[group] || [];
                return (
                    <MetricChip key={group} label={label} value={pct} suffix="%" pct={pct}
                                clickable={advice.length > 0} hint={advice.length > 0}
                                onClick={() => setOpenGroup(group)}
                                data-testid="metric-breakdown-row"
                                data-group={group} data-pct={pct}/>
                );
            })}

            {openGroup && (
                <MyModal isOpen title={openGroup === OVERALL_GROUP ? 'Общая оценка' : openGroup} size="lg" onClose={() => setOpenGroup(null)}>
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
    );
};

export default ScoreStrip;
