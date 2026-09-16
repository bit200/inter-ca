import {formatMs, readBlockTimings, readDialogMetrics, readGreeting, readOverall, withSoftFallback} from './dialogSummary';

// Форма metrics - как её считает services/dialogMetrics.js в itk-platform-api.
const metrics = {
    speech: {managerMs: 30000, clientMs: 70000, totalMs: 100000, managerPercent: 30, clientPercent: 70},
    interruptions: {total: 3, managerInterruptedClient: 1, clientInterruptedManager: 2, unknown: 0},
    blocks: [{responseDelayMs: 1200, answerDurationMs: 45000, pairs: []}],
    responses: {
        responseDelayMs: {count: 4, mean: 1500, median: 1200},
        answerDurationMs: {count: 4, mean: 50000, median: 45000},
    },
};

describe('итог интервью и метрики разговора', () => {
    it('метрики читаются в компактную форму', () => {
        expect(readDialogMetrics({metrics})).toEqual({
            speech: {managerPercent: 30, clientPercent: 70, managerMs: 30000, clientMs: 70000},
            interruptions: {byManager: 1, byClient: 2, total: 3},
            delay: {median: 1200, mean: 1500, count: 4},
            duration: {median: 45000, mean: 50000, count: 4},
        });
        expect(readBlockTimings({metrics})).toEqual(metrics.blocks);
    });

    it('доли речи досчитываются из миллисекунд, пустые метрики - это «нет метрик»', () => {
        expect(readDialogMetrics({metrics: {speech: {managerMs: 1000, clientMs: 3000}}}).speech)
            .toMatchObject({managerPercent: 25, clientPercent: 75});
        expect(readDialogMetrics({metrics: {}})).toBeNull();
        expect(readDialogMetrics({blocks: []})).toBeNull();
        expect(readDialogMetrics(null)).toBeNull();
    });

    it('приветствие и прощание - отдельные отметки, неизвестное остаётся null', () => {
        expect(readGreeting({greeting: {greeted: true, farewelled: false, note: 'Не попрощался'}}))
            .toEqual({greeted: true, farewelled: false, note: 'Не попрощался'});
        expect(readGreeting({greeting: {greeted: true}})).toEqual({greeted: true, farewelled: null, note: ''});
        expect(readGreeting({greeting: {}})).toBeNull();
        expect(readGreeting({})).toBeNull();
    });

    it('итог - текст и балл, шкала по умолчанию десятибалльная или стобалльная по числу', () => {
        expect(readOverall({overall: {score: 7.5, summary: 'Уверенный кандидат', strengths: ['Основы JS'], weaknesses: 'Мало опыта'}}))
            .toEqual({score: 7.5, max: 10, summary: 'Уверенный кандидат', strengths: ['Основы JS'], weaknesses: ['Мало опыта'], message: ''});
        expect(readOverall({overall: {score: 72, text: 'Ок'}})).toMatchObject({max: 100, summary: 'Ок'});
        expect(readOverall({overall: {score: 4, maxScore: 5}})).toMatchObject({max: 5});
        expect(readOverall({overall: {}})).toBeNull();
        expect(readOverall({blocks: []})).toBeNull();
    });

    it('без технических вопросов итоговый балл - среднее по нетехническим ответам', () => {
        let soft = score => ({technical: false, soft: {state: 'done', score, max: 10}});
        let overall = {score: 0, max: 10, summary: 'Технической оценки нет', strengths: [], weaknesses: [], message: ''};
        expect(withSoftFallback(overall, [soft(9), soft(6), {technical: false, soft: {state: 'unanswered'}}]))
            .toEqual({...overall, score: 7.5, basis: 'soft'});
        expect(withSoftFallback(null, [soft(7)])).toBeNull();
        // Есть технический вопрос - балл сервиса не трогаем.
        expect(withSoftFallback(overall, [soft(9), {technical: true, soft: null}])).toBe(overall);
        // Нечего усреднять - тоже.
        expect(withSoftFallback(overall, [{technical: false, soft: {state: 'pending'}}])).toBe(overall);
    });

    it('тайминги пишутся секундами, длинные - минутами', () => {
        expect(formatMs(1200)).toBe('1,2 с');
        expect(formatMs(3000)).toBe('3 с');
        expect(formatMs(45000)).toBe('45 с');
        expect(formatMs(95000)).toBe('1 мин 35 с');
        expect(formatMs(-800)).toBe('−0,8 с');
        expect(formatMs(null)).toBe('—');
    });
});
