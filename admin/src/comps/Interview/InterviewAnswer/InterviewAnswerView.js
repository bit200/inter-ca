import React, {useState} from 'react';

import styles from '../../EvaluationDetail/evaluationDetail.module.scss';
import ScoreStrip from '../../EvaluationDetail/components/ScoreStrip';
import AdviceSection from '../../EvaluationDetail/components/AdviceSection';
import ExplainSection from '../../EvaluationDetail/components/ExplainSection';
import {questionTitle} from '../DialogAnalysis/qaBlocks';
import useInterviewAnswer from './useInterviewAnswer';
import AnswerHero from './AnswerHero';
import AnswerDialogCard from './AnswerDialogCard';

// Реплика блока по роли: вопрос - первая реплика интервьюера, ответ - все
// реплики кандидата подряд.
export function textsOf(block, role) {
    return block.items
        .filter(item => item.turn.role === role && item.turn.text)
        .map(item => String(item.turn.text).trim());
}

// Полная детализация технической оценки ответа из разбора диалога - та же
// раскладка, что у разбора ответа на тренировке (/evaluations/:id): линейка
// показателей, ответ и советы. Получает всё пропсами и не знает про роутер,
// поэтому одинаково открывается страницей и в модалке. header - то, что
// стоит над контентом (ссылка «назад» на странице).
export default function InterviewAnswerView({interviewId, number, header = null}) {
    const {block, loading, reference} = useInterviewAnswer(interviewId, number);
    // Кнопка расшифровки стоит в шапке рядом с вопросом, а общий вывод - карточкой
    // сразу под ответом. callback-ref через useState, чтобы порталы
    // ExplainSection получили уже смонтированные узлы.
    const [explainSlot, setExplainSlot] = useState(null);
    const [summarySlot, setSummarySlot] = useState(null);

    if (loading) {
        return <div className={styles.page}>{header}Загрузка...</div>;
    }
    if (!block) {
        return <div className={styles.page}>
            {header}
            <div className={`card ${styles.infoCardSpacing}`}>
                <div className="card-body">
                    Вопрос {number} не найден в оценке ответов этого интервью. Вернитесь к разбору диалога и откройте вопрос оттуда.
                </div>
            </div>
        </div>;
    }

    const {evaluation} = block;
    const result = evaluation.result || {};
    const score = evaluation.state === 'done' ? evaluation.score : null;
    const questionText = result.question || questionTitle(block);
    const answerText = result.text || textsOf(block, 'client').join(' ');
    const explainAnswer = () => global.http.post(`/my-interview/${interviewId}/answers-evaluation/${block.number}/explain`, {}, {wo_notify: true});

    return (
        <div className={styles.page} data-testid="interview-answer-view">
            {header}

            <AnswerHero block={block} questionText={questionText} score={score} max={evaluation.max}
                        onExplainSlot={setExplainSlot}/>

            {score == null
                ? <div className={`card ${styles.infoCardSpacing}`}>
                    <div className="card-body">
                        {evaluation.state === 'error'
                            ? `Ответ не оценён: ${evaluation.message || 'сервис оценки не сообщил причину.'}`
                            : 'Ответ ещё не оценён. Запустите оценку ответов на вкладке «Разбор диалога».'}
                    </div>
                </div>
                : <ScoreStrip score={score} max={evaluation.max} rules={reference.rules} schemas={reference.schemas} result={result}/>}

            <div className={styles.columns}>
                {answerText && (
                    <div className={styles.answerColumn}>
                        <AnswerDialogCard questionText={questionText} answerText={answerText} feedback={evaluation.feedback}/>
                        <div ref={setSummarySlot} className={styles.summarySlot}/>
                    </div>
                )}

                {score != null && (
                    <div className={styles.sideColumn}>
                        <AdviceSection rules={reference.rules} schemas={reference.schemas} result={result}/>
                    </div>
                )}
            </div>

            {score != null && (
                <ExplainSection onExplain={explainAnswer} initialExplain={block.explain}
                                buttonSlot={explainSlot} summarySlot={summarySlot}
                                buttonClassName={`btn btn-sm ${styles.explainAction}`}/>
            )}
        </div>
    );
}
