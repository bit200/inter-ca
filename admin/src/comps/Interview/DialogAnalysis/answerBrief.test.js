import {answerBrief, answerDetailPath} from './answerBrief';
import {readQaBlocks} from './qaBlocks';

const schemas = [
    {key: 'score', group: 'Итог', min: 0, max: 10},
    {key: 'evaluation.relevance.relevance', group: 'Релевантность', min: 0, max: 9},
    {key: 'evaluation.depth.depth_score', group: 'Глубина', min: 0, max: 10},
];
const rules = [
    {key: 'evaluation.depth.depth_score', from: 0, to: 4, advice: 'Раскройте тему глубже'},
    {key: 'evaluation.relevance.relevance', from: 0, to: 4, advice: 'Отвечайте по теме'},
];

describe('answerBrief: короткая детализация технической оценки ответа', () => {
    test('вердикт, проценты по группам без итоговой, критическая ошибка и совет по самому слабому месту', () => {
        const brief = answerBrief({
            score: 2.8,
            evaluation: {
                relevance: {relevance: 9},
                depth: {depth_score: 2},
                errors: {is_critical: 1, errors: ['Путает понятия']},
            },
        }, schemas, rules);

        expect(brief).toMatchObject({score: 2.8, max: 10, verdict: 'Ответ не засчитан', criticalErrors: ['Путает понятия']});
        expect(brief.rows).toEqual([
            {group: 'Релевантность', label: 'Релевантность', pct: 100},
            {group: 'Глубина', label: 'Глубина', pct: 20},
        ]);
        expect(brief.advice).toEqual({label: 'Глубина', text: 'Раскройте тему глубже'});
    });

    test('без критической ошибки и слабых мест - ни ошибки, ни совета', () => {
        const brief = answerBrief({score: 9, evaluation: {relevance: {relevance: 9}, depth: {depth_score: 9}, errors: {is_critical: 0, errors: ['мелочь']}}}, schemas, rules);
        expect(brief.criticalErrors).toEqual([]);
        expect(brief.advice).toBeNull();
        expect(brief.verdict).toBe('Отличный ответ');
    });

    test('результат сервиса оценки доезжает из блока разбора - и плоский, и вложенный в result', () => {
        const [flat, nested, pending] = readQaBlocks({blocks: [
            {technical: true, question: 'Q1', answer: 'A1', evaluate: {score: 3, evaluation: {depth: {depth_score: 2}}}},
            {technical: true, question: 'Q2', answer: 'A2', evaluate: {result: {score: 7, evaluation: {depth: {depth_score: 8}}}}},
            {technical: true, question: 'Q3', answer: 'A3'},
        ]}, []);
        expect(flat.evaluation.result.evaluation.depth.depth_score).toBe(2);
        expect(nested.evaluation.result.evaluation.depth.depth_score).toBe(8);
        expect(pending.evaluation.result).toBeNull();
    });

    test('страница детализации адресуется номером вопроса в интервью', () => {
        expect(answerDetailPath(1000, 16)).toBe('/interviews/1000/answers/16');
    });
});
