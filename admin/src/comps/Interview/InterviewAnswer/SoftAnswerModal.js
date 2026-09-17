import React, {useEffect, useState} from 'react';

import MyModal from '../../../libs/MyModal/MyModal';
import styles from '../../EvaluationDetail/evaluationDetail.module.scss';
import dialogStyles from '../DialogAnalysis/dialogAnalysis.module.scss';
import {questionTitle} from '../DialogAnalysis/qaBlocks';
import {SoftBrief} from '../DialogAnalysis/AnswerBriefPopover';
import {loadEvaluationReference, softAdvice} from '../DialogAnalysis/answerBrief';
import AnswerHero from './AnswerHero';
import AnswerDialogCard from './AnswerDialogCard';
import {textsOf} from './InterviewAnswerView';

// Разбор нетехнического ответа поверх разбора диалога - той же раскладкой, что
// у технического (InterviewAnswerModal): шапка вопроса, ответ кандидата и рядом
// - из чего сложилась оценка. Под ответом - комментарий оценки и рекомендации
// из «Советов по оценке» (правила с ключами soft.*). Блок уже загружен табом.
export default function SoftAnswerModal({block, evaluation, isOpen, onClose}) {
    let [rules, setRules] = useState([]);
    useEffect(() => {
        if (!isOpen) return;
        let alive = true;
        loadEvaluationReference().then(value => alive && setRules(value.rules || []));
        return () => { alive = false; };
    }, [isOpen]);

    const questionText = questionTitle(block);
    const answerText = textsOf(block, 'client').join(' ');
    const advice = softAdvice(evaluation, rules);
    const hasLeft = answerText || evaluation.note || advice.length > 0;
    return (
        <MyModal isOpen={isOpen} onClose={onClose} size="full" defClass="answer-modal">
            {isOpen && <div className={`${styles.page} ${dialogStyles.palette}`} data-testid="soft-answer-view">
                <AnswerHero block={block} questionText={questionText} score={evaluation.score} max={evaluation.max}/>
                <div className={styles.columns}>
                    {hasLeft && <div className={dialogStyles.softAnswerStack}>
                        {answerText && <AnswerDialogCard questionText={questionText} answerText={answerText}/>}
                        {evaluation.note && <div className="card" role="region" aria-label="Комментарий оценки">
                            <div className="card-body">
                                <div className={styles.title}>Комментарий оценки</div>
                                <p className={styles.answerText} style={{margin: 0}}>{evaluation.note}</p>
                            </div>
                        </div>}
                        {advice.length > 0 && <div className="card" role="region" aria-label="Рекомендации">
                            <div className="card-body">
                                <div className={styles.title}>Рекомендации</div>
                                <ul className={`${dialogStyles.softAdviceList} ${styles.answerText}`}>
                                    {advice.map(text => <li key={text}>{text}</li>)}
                                </ul>
                            </div>
                        </div>}
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
