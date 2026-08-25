import { getQuestionEvaluateStatus, jobsByQuestion, countFailedQuestions, hasEvaluateResult } from './evaluateJobState';

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
