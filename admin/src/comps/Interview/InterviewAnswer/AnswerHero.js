import React from 'react';

import styles from '../../EvaluationDetail/evaluationDetail.module.scss';
import {scoreVerdict} from '../../EvaluationDetail/components/scoreVerdict';
import {shortQuestionTitle} from '../DialogAnalysis/qaBlocks';
import {formatDuration} from '../DialogAnalysis/dialogAnalysisFormat';

// Шапка разбора ответа: номер и текст вопроса, чипы, слот под кнопку расшифровки.
export default function AnswerHero({block, questionText, score, max, onExplainSlot}) {
    return (
        <div className={`card ${styles.infoCardSpacing}`}>
            <div className={`card-body ${styles.hero}`} data-testid="answer-hero">
                <div className={styles.heroMain}>
                    <div className={styles.title}>Вопрос {block.number} из интервью</div>
                    <div className={styles.questionText} title={questionText}>{shortQuestionTitle(questionText)}</div>
                    <div className={styles.chips}>
                        <span className={styles.chip}>{block.technical === false ? 'Нетехнический' : 'Технический'}</span>
                        {block.startMs !== null && (
                            <span className={styles.chip}>
                                {formatDuration(block.startMs)}–{formatDuration(block.endMs === null ? block.startMs : block.endMs)}
                            </span>
                        )}
                        {score != null && (
                            <span className={`${styles.chip} ${styles.chipVerdict}`}>{scoreVerdict(score, max)}</span>
                        )}
                    </div>
                </div>

                <div className={styles.heroActions}>
                    {/* Сюда ExplainSection порталом кладёт "Расшифровать оценку" */}
                    <div ref={onExplainSlot} className={styles.heroSlot}/>
                </div>
            </div>
        </div>
    );
}
