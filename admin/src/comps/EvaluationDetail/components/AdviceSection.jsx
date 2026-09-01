import React from 'react';
import styles from '../evaluationDetail.module.scss'
import { groupAdvice } from './adviceLogic';
import { buildGroupPercents, weakestGroup, WEAK_PCT } from './metricGroups';

export { buildGroupPercents, weakestGroup };

// Сколько советов показывать прямо на странице. Раньше рекомендация - самое
// ценное на экране - лежала за кликом по строке метрики, и её никто не видел.
// Теперь советы по самым слабым группам стоят заметками на полях; остальное
// открывается кликом по чипу показателя в линейке оценки (см. ScoreStrip).
const VISIBLE_ADVICE = 2;

const AdviceSection = ({ rules, schemas, result }) => {
    const rows = buildGroupPercents(schemas, result);
    const adviceByGroup = groupAdvice(rules, schemas, result);
    const criticalErrors = result?.evaluation?.errors?.is_critical
        ? (result.evaluation.errors.errors || [])
        : [];

    // Наружу выносим советы по проседающим группам, от самой слабой к менее
    // слабой - по одному на группу, чтобы разные темы не вытеснялись двумя
    // советами про одно и то же.
    const highlighted = rows
        .filter(row => row.pct < WEAK_PCT && (adviceByGroup[row.group] || []).length > 0)
        .sort((a, b) => a.pct - b.pct)
        .slice(0, VISIBLE_ADVICE)
        .map(row => ({ ...row, advice: adviceByGroup[row.group][0].advice }));

    if (!highlighted.length && !criticalErrors.length) {
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

                {highlighted.length > 0 && (
                    <>
                        <div className={styles.adviceTitle}>Что подтянуть</div>
                        <div className={styles.adviceOut} data-testid="metric-advice-out">
                            {highlighted.map(({ group, label, advice }) => (
                                <div key={group} className={styles.adviceOutItem} data-group={group}>
                                    <i className="iconoir-light-bulb-on"/>
                                    <div>
                                        <b>{label}</b>
                                        <p>{advice}</p>
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
