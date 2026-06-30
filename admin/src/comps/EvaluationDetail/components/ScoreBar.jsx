import React from 'react';

import styles from '../evaluationDetail.module.scss'

const lerp = (a, b, t) => Math.round(a + (b - a) * t);

const getScoreRGB = (score, max) => {
    const t = Math.max(0, Math.min(1, score / max));
    let r, g, b;
    if (t < 0.5) {
        // red → yellow
        const s = t / 0.5;
        r = lerp(230, 235, s); g = lerp(25, 195, s); b = lerp(25, 0, s);
    } else {
        // yellow → green
        const s = (t - 0.5) / 0.5;
        r = lerp(235, 28, s); g = lerp(195, 190, s); b = lerp(0, 28, s);
    }
    return `rgb(${r},${g},${b})`;
}

const ScoreBar = ({ score, max = 10 }) => {
    const pct = Math.round((score / max) * 100);
    const color = getScoreRGB(score, max)

    return (
        <div>
            <div style={{ fontSize: 36,  color }}>{score}<span style={{ fontSize: 16, color: '#999' }}>/{max}</span></div>
            <div className={styles.scoreBar}>
                <div style={{ background: color, width: `${pct}%` }} />
            </div>
        </div>
    );
};

export default ScoreBar;
