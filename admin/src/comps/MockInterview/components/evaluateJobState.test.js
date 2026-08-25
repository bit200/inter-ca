import { getQuestionEvaluateStatus, jobsByQuestion, countFailedQuestions, hasEvaluateResult, attemptScoreSummary } from './evaluateJobState';

describe('getQuestionEvaluateStatus', () => {
    it('отдаёт done, когда оценка есть - даже если джоба помечена errored', () => {
        // Пачка упала целиком (evaluateState.status === 'errored'), но по этому
        // вопросу оценка успела посчитаться - показывать надо её.
        expect(getQuestionEvaluateStatus({ score: 7 }, { status: 'errored' })).toBe('done');
    });

    it('отдаёт error, когда джоба упала и оценки нет', () => {
        expect(getQuestionEvaluateStatus(undefined, { status: 'errored', evaluateId: null })).toBe('error');
        expect(getQuestionEvaluateStatus(null, { status: 'failed' })).toBe('error');
    });

    it('различает processing и pending', () => {
        expect(getQuestionEvaluateStatus(null, { status: 'processing' })).toBe('processing');
        expect(getQuestionEvaluateStatus(null, { status: 'pending' })).toBe('pending');
        expect(getQuestionEvaluateStatus(null, undefined)).toBe('pending');
    });

    it('пустую оценку без score не считает готовой', () => {
        expect(hasEvaluateResult({})).toBe(false);
        expect(getQuestionEvaluateStatus({}, { status: 'errored' })).toBe('error');
    });
});

describe('jobsByQuestion', () => {
    it('индексирует джобы по questionId и переживает отсутствие evaluateState', () => {
        const state = { status: 'errored', jobs: [{ questionId: 'q-1', status: 'done' }, null] };
        expect(jobsByQuestion(state)['q-1'].status).toBe('done');
        expect(jobsByQuestion(undefined)).toEqual({});
    });
});

describe('countFailedQuestions', () => {
    it('считает вопросы без оценки', () => {
        const turns = [
            { evaluateStatus: 'done' },
            { evaluateStatus: 'error' },
            { evaluateStatus: 'error' },
            { evaluateStatus: 'pending' },
        ];
        expect(countFailedQuestions(turns)).toBe(2);
    });
});

describe('attemptScoreSummary', () => {
    it('считает балл по оценённым вопросам и говорит, сколько их из общего числа', () => {
        // Пачка упала частично: 10 вопросов, оценились 2 - средний балл
        // считается по ним, но выдавать его за оценку всей попытки нельзя.
        const attempt = {
            turns: new Array(10).fill({}),
            evaluate: [
                { questionId: 'q-1', evaluate: { score: 8 } },
                { questionId: 'q-2', evaluate: { score: 7 } },
                { questionId: 'q-3', evaluate: {} },
            ],
        };
        expect(attemptScoreSummary(attempt)).toEqual({ score: 7.5, scored: 2, total: 10 });
    });

    it('на полностью оценённой попытке scored совпадает с total', () => {
        const attempt = {
            turns: [{}, {}],
            evaluate: [
                { questionId: 'q-1', evaluate: { score: 6 } },
                { questionId: 'q-2', evaluate: { score: 9 } },
            ],
        };
        expect(attemptScoreSummary(attempt)).toEqual({ score: 7.5, scored: 2, total: 2 });
    });

    it('без единой оценки балла нет', () => {
        expect(attemptScoreSummary({ turns: [{}, {}], evaluate: [] })).toEqual({ score: null, scored: 0, total: 2 });
    });
});
