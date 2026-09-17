import {useEffect, useState} from 'react';

import {normalizeAnswers} from '../DialogAnalysis/dialogAnalysisState';
import {readQaBlocks} from '../DialogAnalysis/qaBlocks';
import {loadEvaluationReference} from '../DialogAnalysis/answerBrief';

// Номер вопроса - порядок блока в оценке ответов.
export function findAnswerBlock(result, number) {
    return readQaBlocks(result, []).find(block => block.number === +number) || null;
}

// Данные разбора одного ответа интервью: блок вопроса и справочники метрик.
// Не зависит от роутера - одинаково работает на странице и в модалке.
export default function useInterviewAnswer(interviewId, number) {
    const [block, setBlock] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reference, setReference] = useState({schemas: [], rules: []});

    useEffect(() => {
        let alive = true;
        setLoading(true);
        global.http.get(`/my-interview/${interviewId}/answers-evaluation`, {}, {wo_notify: true})
            .then(payload => {
                const answers = normalizeAnswers((payload && payload.answersEvaluation) || payload);
                alive && setBlock(findAnswerBlock(answers.result, number));
            })
            .catch(() => alive && setBlock(null))
            .finally(() => alive && setLoading(false));
        return () => { alive = false; };
    }, [interviewId, number]);

    useEffect(() => {
        let alive = true;
        loadEvaluationReference().then(value => alive && setReference(value));
        return () => { alive = false; };
    }, []);

    return {block, loading, reference};
}
