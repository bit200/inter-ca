import React from 'react';

import MyModal from '../../../libs/MyModal/MyModal';
import styles from '../../EvaluationDetail/evaluationDetail.module.scss';
import {questionTitle} from '../DialogAnalysis/qaBlocks';
import {SoftBrief} from '../DialogAnalysis/AnswerBriefPopover';
import AnswerHero from './AnswerHero';
import AnswerDialogCard from './AnswerDialogCard';
import {textsOf} from './InterviewAnswerView';

// Разбор нетехнического ответа поверх разбора диалога - той же раскладкой, что
// у технического (InterviewAnswerModal): шапка вопроса, ответ кандидата и рядом
// - из чего сложилась оценка. Блок уже загружен табом, поэтому без запроса.
export default function SoftAnswerModal({block, evaluation, isOpen, onClose}) {
    const questionText = questionTitle(block);
    const answerText = textsOf(block, 'client').join(' ');
    return (
        <MyModal isOpen={isOpen} onClose={onClose} size="full">
            {isOpen && <div className={styles.page} data-testid="soft-answer-view">
                <AnswerHero block={block} questionText={questionText} score={evaluation.score} max={evaluation.max}/>
                <div className={styles.columns}>
                    {answerText && <div className={styles.answerColumn}>
                        <AnswerDialogCard questionText={questionText} answerText={answerText}/>
                    </div>}
                    <div className={styles.sideColumn}>
                        <div className="card">
                            <div className="card-body">
                                <SoftBrief evaluation={evaluation}/>
                            </div>
                        </div>
                    </div>
                </div>
            </div>}
        </MyModal>
    );
}
