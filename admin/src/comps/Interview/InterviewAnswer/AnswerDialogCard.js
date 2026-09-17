import React from 'react';

import styles from '../../EvaluationDetail/evaluationDetail.module.scss';

// Карточка «Как прошёл ответ»: вопрос, ответ кандидата и отзыв оценки.
export default function AnswerDialogCard({questionText, answerText, feedback}) {
    return (
        <div className="card">
            <div className="card-body">
                <div className={styles.title}>Как прошёл ответ</div>
                <div className={`${styles.turn} ${styles.turnAsk}`}>
                    <span className={styles.turnWho}>Вопрос</span>
                    <div className={styles.turnBody}>{questionText}</div>
                </div>
                <div className={styles.turn}>
                    <span className={`${styles.turnWho} ${styles.turnWhoAnswer}`}>Ответ</span>
                    <div className={`${styles.turnBody} ${styles.answerText}`}>{answerText}</div>
                </div>
                {feedback && <p className={styles.answerText} style={{marginTop: 12}}>{feedback}</p>}
            </div>
        </div>
    );
}
