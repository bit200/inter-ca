import React from 'react';

import styles from '../evaluationDetail.module.scss';
import { getScoreRGB } from './scoreColor';
import { formatScore } from './formatScore';
import { mentorReviewDelta } from './mentorReviewDelta';

// Оценка куратора - вторым ярусом той же карточки, что и автоматический балл:
// живой человек посмотрел этот же ответ, и его слово должно стоять рядом с
// машинным, а не отдельным блоком где-то под транскриптом.
// Балл набран тем же кеглем, что цифра в дуге (.dialValue), но без самой дуги -
// полукруг остаётся приметой автоматической оценки, и два балла не путаются.
export default function MentorReviewSection({ review, autoScore }) {
    if (!review) {
        return null;
    }

    const score = typeof review.score === 'number' ? review.score : null;
    const comment = (review.comment || '').trim();
    if (score == null && !comment) {
        return null;
    }

    const delta = score == null ? '' : mentorReviewDelta(score, autoScore);

    return (
        <div
            className={styles.mentorBand + (score == null ? ' ' + styles.mentorBandFlat : '')}
            data-testid="mentor-review"
        >
            {score != null && (
                <div className={styles.mentorScore} style={{ color: getScoreRGB(score) }}>
                    {formatScore(score)}<span>/10</span>
                </div>
            )}

            <div className={styles.mentorBody}>
                <div className={styles.mentorHead}>
                    <span className={styles.mentorEyebrow}>
                        {score == null ? 'Рекомендация куратора' : 'Оценка куратора'}
                    </span>
                    {review.mentorName && <span className={styles.mentorWho}>{review.mentorName}</span>}
                    {delta && <span className={styles.mentorDelta}>{delta}</span>}
                </div>

                {comment
                    ? <p className={styles.mentorComment}>{comment}</p>
                    : <p className={styles.mentorEmpty}>Куратор поставил балл без комментария</p>}
            </div>
        </div>
    );
}
