import React from 'react';

import styles from '../evaluationDetail.module.scss';
import { getScoreRGB } from './scoreColor';
import { scoreVerdict } from './scoreVerdict';
import { formatScore } from './formatScore';

// Дуга балла в шапке страницы. Прежняя горизонтальная полоса стояла третьим
// блоком после длинного транскрипта - балл, ради которого страницу и
// открывают, приходилось искать. Здесь он первый и вместе со словесным
// вердиктом отвечает на "как ответил?" без прокрутки.
const R = 54;
const ARC = Math.PI * R; // длина полукруга, из неё считается заполнение

const ScoreDial = ({ score, max = 10 }) => {
    const t = Math.max(0, Math.min(1, (Number(score) || 0) / max));
    const color = getScoreRGB(score, max);

    return (
        <div className={styles.dial} data-testid="evaluate-score" data-score={score}>
            <svg width="132" height="78" viewBox="0 0 132 78" aria-hidden="true">
                <path d="M12 70 A54 54 0 0 1 120 70" fill="none" stroke="var(--bs-border-color)"
                      strokeWidth="10" strokeLinecap="round"/>
                <path d="M12 70 A54 54 0 0 1 120 70" fill="none" stroke={color}
                      strokeWidth="10" strokeLinecap="round"
                      strokeDasharray={`${ARC * t} ${ARC}`}/>
            </svg>
            <div className={styles.dialValue} style={{ color }}>
                {formatScore(score)}<span>/{max}</span>
            </div>
            <div className={styles.dialVerdict} style={{ color }} data-testid="evaluate-verdict">
                {scoreVerdict(score, max)}
            </div>
        </div>
    );
};

export default ScoreDial;
