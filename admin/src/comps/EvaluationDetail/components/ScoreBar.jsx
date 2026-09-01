import React from 'react';

import styles from '../evaluationDetail.module.scss'
import { getScoreRGB } from './scoreColor';

export { getScoreRGB };

const ScoreBar = ({ score, max = 10 }) => {
    const pct = Math.round((score / max) * 100);
    const color = getScoreRGB(score, max)

    return (
        <div className={'card-body'}>
            <div style={{ fontSize: 36,  color }} data-testid="evaluate-score" data-score={score}>{score}<span style={{ fontSize: 16, color: 'var(--bs-text-muted)' }}>/{max}</span></div>
            <div className={styles.scoreBar}>
                <div style={{ background: color, width: `${pct}%` }} />
            </div>
        </div>
    );
};

export default ScoreBar;
