import {formatMs, readBlockTimings, readDialogMetrics, readGreeting, readOverall, combineOverall, technicalScoreShift, SOFT_WEIGHT} from './dialogSummary';

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
        expect(readDialogMetrics({metrics: {speech: {managerMs: 0, clientMs: 0, managerPercent: 0, clientPercent: 0}}})).toBeNull();
        expect(readDialogMetrics({metrics: {speech: {managerPercent: 0, clientPercent: 0}, interruptions: {total: 1, managerInterruptedClient: 1}}}).speech).toBeNull();
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
        expect(combineOverall(overall, [soft(9), soft(6), {technical: false, soft: {state: 'unanswered'}}]))
            .toEqual({...overall, score: 7.5, basis: 'soft'});
        expect(combineOverall(null, [soft(7)])).toBeNull();
        // Есть технический вопрос, но нечего сводить с нетехнической частью - балл сервиса не трогаем.
        expect(combineOverall({...overall, score: 5}, [{technical: true, soft: null}])).toEqual({...overall, score: 5});
        // Нечего усреднять - тоже.
        expect(combineOverall(overall, [{technical: false, soft: {state: 'pending'}}])).toBe(overall);
    });

    it('итог сводит техническую и нетехническую оценки, нетехническая с весом 0.6', () => {
        let overall = {score: 4.6, max: 10, summary: 'Средний уровень', strengths: [], weaknesses: [], message: ''};
        let blocks = [{technical: true, soft: null}, {technical: false, soft: {state: 'done', score: 8, max: 10}},
            {technical: false, soft: {state: 'done', score: 3, max: 5}}];
        // Нетехническая - среднее 8 и 6 = 7; итог (4.6 + 7 * 0.6) / 1.6 = 5.5.
        expect(SOFT_WEIGHT).toBe(0.6);
        expect(combineOverall(overall, blocks)).toEqual({...overall, score: 5.5, basis: 'combined',
            parts: {technical: 4.6, soft: 7, softWeight: 0.6}});
        // Вес из админки: (4.6 + 7 * 1) / 2 = 5.8.
        expect(combineOverall(overall, blocks, 1)).toEqual({...overall, score: 5.8, basis: 'combined',
            parts: {technical: 4.6, soft: 7, softWeight: 1}});
    });

    it('выключенный компонент («не учитывать стиль») сдвигает и итог интервью', () => {
        let overall = {score: 5.1, max: 10, summary: '', strengths: [], weaknesses: [], message: ''};
        // Стиль выключен: балл вопроса пересчитан с 5 до 6 и с 7 до 7.4, исходный сохранён
        // в originalScore - средний сдвиг +0.7.
        let technical = (score, originalScore) => ({technical: true, soft: null,
            evaluation: {state: 'done', score, originalScore}});
        expect(technicalScoreShift([technical(6, 5), technical(7.4, 7)])).toBeCloseTo(0.7);

        // Нетехнических ответов нет - двигается сам балл сервиса: 5.1 + 0.7 = 5.8.
        expect(combineOverall(overall, [technical(6, 5), technical(7.4, 7)]))
            .toEqual({...overall, score: 5.8});
        // Стиль учитывается (пересчёта не было) - итог остаётся объектом сервиса как есть.
        expect(combineOverall(overall, [{technical: true, soft: null, evaluation: {state: 'done', score: 5, originalScore: null}}]))
            .toBe(overall);

        // Есть и нетехническая часть: техническая идёт в свод уже сдвинутой.
        let blocks = [technical(6, 5), {technical: false, soft: {state: 'done', score: 7, max: 10}}];
        // (5.1 + 1 + 7 * 0.6) / 1.6 = 6.4
        expect(combineOverall(overall, blocks)).toEqual({...overall, score: 6.4, basis: 'combined',
            parts: {technical: 6.1, soft: 7, softWeight: 0.6}});
    });

    it('сдвиг итога зажат шкалой и не срывается на неготовых оценках', () => {
        let overall = {score: 9.8, max: 10, summary: '', strengths: [], weaknesses: [], message: ''};
        let up = {technical: true, soft: null, evaluation: {state: 'done', score: 10, originalScore: 5}};
        expect(combineOverall(overall, [up]).score).toBe(10);
        // Оценка ещё считается - сдвигать нечем.
        expect(combineOverall(overall, [{technical: true, evaluation: {state: 'pending', score: null, originalScore: null}}]))
            .toBe(overall);
        expect(technicalScoreShift(null)).toBe(0);
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
