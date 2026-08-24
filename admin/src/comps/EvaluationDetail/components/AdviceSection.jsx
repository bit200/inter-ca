import React, { useState } from 'react';
import styles from '../evaluationDetail.module.scss'
import MyModal from '../../../libs/MyModal';
import { getScoreRGB } from './scoreColor';
import { groupAdvice } from './adviceLogic';
import { buildGroupPercents, weakestGroup, WEAK_PCT } from './metricGroups';

export { buildGroupPercents, weakestGroup };

// Сколько советов показывать прямо на странице. Раньше рекомендация - самое
// ценное на экране - лежала за кликом по строке метрики, и её никто не видел.
// Теперь советы по самым слабым группам стоят под метриками; модалка осталась
// для всего остального, чтобы колонка не превратилась в простыню.
const VISIBLE_ADVICE = 2;

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

    // Наружу выносим советы по проседающим группам, от самой слабой к менее
    // слабой - по одному на группу, чтобы разные темы не вытеснялись двумя
    // советами про одно и то же.
    const highlighted = rows
        .filter(row => row.pct < WEAK_PCT && (adviceByGroup[row.group] || []).length > 0)
        .sort((a, b) => a.pct - b.pct)
        .slice(0, VISIBLE_ADVICE)
        .map(row => ({ ...row, advice: adviceByGroup[row.group][0].advice }));

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
                        <div className={styles.adviceTitle}>Из чего сложился балл</div>

                        {/* Общая ось 0-100 для всех показателей: точки выстраиваются
                            в столбик, и просевший показатель виден тем, что его точка
                            выпала влево - без чтения процентов. */}
                        <div className={styles.metricAxis} aria-hidden="true">
                            <span style={{ left: '0%' }}>0</span>
                            <span style={{ left: '50%' }}>50</span>
                            <span style={{ left: '100%' }}>100%</span>
                        </div>

                        <div className={styles.metricBreakdown} data-testid="metric-breakdown">
                            {rows.map(({ group, label, pct }) => {
                                const advice = adviceByGroup[group] || [];
                                const clickable = advice.length > 0;
                                // Та же красно-жёлто-зелёная шкала, что и у большого балла в
                                // ScoreDial - визуально привязывает метрики к оценке сверху.
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
                                        <span className={styles.metricRowTrack}>
                                            <i className={styles.metricRowTick}/>
                                            <span className={styles.metricRowFill}
                                                  style={{ width: `${pct}%`, background: color }}/>
                                            <span className={styles.metricRowDot}
                                                  style={{ left: `${pct}%`, background: color }}/>
                                        </span>
                                        <span className={styles.metricRowPct} style={{ color }}>{pct}%</span>
                                    </div>
                                );
                            })}
                        </div>

                        {highlighted.length > 0 && (
                            <div className={styles.adviceOut} data-testid="metric-advice-out">
                                {highlighted.map(({ group, label, advice }) => (
                                    <div key={group} className={styles.adviceOutItem} data-group={group}>
                                        <i className="iconoir-light-bulb-on"/>
                                        <div>
                                            <b>Что подтянуть · {label}</b>
                                            <p>{advice}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
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
