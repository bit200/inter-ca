import React from 'react';

import styles from '../evaluationDetail.module.scss';
import { getScoreRGB, getScoreTextColor, scoreLevel } from './scoreColor';
import { filledSegments, SEGMENTS } from './scoreSegments';

// Чип показателя: пять делений, название, число. Единственный графический приём
// линейки - и общая оценка, и каждый показатель меряются одинаково, поэтому
// сравнивать их можно не читая цифр.
const MetricChip = ({ label, value, suffix, pct, max = 100, lead, clickable, hint, onClick, ...rest }) => {
    const level = scoreLevel(pct, max);
    const color = getScoreRGB(pct, max);
    // Деления и подпись красятся одним смыслом, но разными тонами: заливке
    // нужен насыщенный цвет, тексту - тёмный, иначе цифра бледнее названия.
    const textColor = getScoreTextColor(pct, max);
    const filled = filledSegments(pct, max);
    const zero = filled === 0;

    const classes = [styles.mchip];
    if (lead) classes.push(styles.mchipLead);
    // Проседающий показатель - единственный цветной чип в линейке: остальные
    // держат общий вид, и глаз сразу видит, куда смотреть.
    if (level === 'bad') classes.push(styles.mchipBad);
    if (zero) classes.push(styles.mchipZero);

    return (
        <span className={classes.join(' ')}
              data-clickable={!!clickable}
              data-level={level}
              data-zero={zero}
              onClick={clickable ? onClick : undefined}
              {...rest}>
            <span className={styles.mchipSeg} aria-hidden="true">
                {Array.from({ length: SEGMENTS }, (_, i) => (
                    <i key={i} style={i < filled ? { background: color } : undefined}/>
                ))}
            </span>
            <span className={styles.mchipName}>{label}</span>
            <span className={styles.mchipValue} style={{ color: textColor }}>
                {value}{suffix && <small>{suffix}</small>}
            </span>
            {hint && (
                <i className={`iconoir-light-bulb-on ${styles.mchipHint}`}
                   data-testid="metric-breakdown-row-hint"
                   title="Есть рекомендация - нажмите, чтобы посмотреть"/>
            )}
        </span>
    );
};

export default MetricChip;
