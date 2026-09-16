import React, {useEffect, useState} from 'react';
import {Link, useParams} from 'react-router-dom';

import styles from '../EvaluationDetail/evaluationDetail.module.scss';
import ScoreStrip from '../EvaluationDetail/components/ScoreStrip';
import AdviceSection from '../EvaluationDetail/components/AdviceSection';
import ExplainSection from '../EvaluationDetail/components/ExplainSection';
import {scoreVerdict} from '../EvaluationDetail/components/scoreVerdict';
import {normalizeAnswers} from './DialogAnalysis/dialogAnalysisState';
import {questionTitle, readQaBlocks, shortQuestionTitle} from './DialogAnalysis/qaBlocks';
import {formatDuration} from './DialogAnalysis/dialogAnalysisFormat';
import {loadEvaluationReference} from './DialogAnalysis/answerBrief';

// Реплика блока по роли: вопрос - первая реплика интервьюера, ответ - все
// реплики кандидата подряд.
function textsOf(block, role) {
    return block.items
        .filter(item => item.turn.role === role && item.turn.text)
        .map(item => String(item.turn.text).trim());
}

// Полная детализация технической оценки ответа из разбора диалога - та же
// раскладка, что у разбора ответа на тренировке (/evaluations/:id): линейка
// показателей, ответ и советы. Номер вопроса - порядок блока в оценке ответов.
export function findAnswerBlock(result, number) {
    return readQaBlocks(result, []).find(block => block.number === +number) || null;
}

export default function InterviewAnswerDetail() {
    const {id, number} = useParams();
    const [block, setBlock] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reference, setReference] = useState({schemas: [], rules: []});
    // Как на /evaluations/:id: кнопка расшифровки стоит в шапке рядом с вопросом,
    // а общий вывод - карточкой сразу под ответом. callback-ref через useState,
    // чтобы порталы ExplainSection получили уже смонтированные узлы.
    const [explainSlot, setExplainSlot] = useState(null);
    const [summarySlot, setSummarySlot] = useState(null);

    useEffect(() => {
        setLoading(true);
        global.http.get(`/my-interview/${id}/answers-evaluation`, {}, {wo_notify: true})
            .then(payload => {
                const answers = normalizeAnswers((payload && payload.answersEvaluation) || payload);
                setBlock(findAnswerBlock(answers.result, number));
            })
            .catch(() => setBlock(null))
            .finally(() => setLoading(false));
    }, [id, number]);

    useEffect(() => {
        let alive = true;
        loadEvaluationReference().then(value => alive && setReference(value));
        return () => { alive = false; };
    }, []);

    const backTo = `/interviews/${id}?tab=dialog`;
    const back = <Link to={backTo} style={{fontSize: 13, color: 'var(--bs-text-muted)'}}>← Разбор диалога</Link>;

    if (loading) {
        return <div className={styles.page}>Загрузка...</div>;
    }
    if (!block) {
        return <div className={styles.page}>
            {back}
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
    const explainAnswer = () => global.http.post(`/my-interview/${id}/answers-evaluation/${block.number}/explain`, {}, {wo_notify: true});

    return (
        <div className={styles.page}>
            {back}

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
                                <span className={`${styles.chip} ${styles.chipVerdict}`}>{scoreVerdict(score, evaluation.max)}</span>
                            )}
                        </div>
                    </div>

                    <div className={styles.heroActions}>
                        {/* Сюда ExplainSection порталом кладёт "Расшифровать оценку" */}
                        <div ref={setExplainSlot} className={styles.heroSlot}/>
                    </div>
                </div>
            </div>

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
                                {evaluation.feedback && <p className={styles.answerText} style={{marginTop: 12}}>{evaluation.feedback}</p>}
                            </div>
                        </div>
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
