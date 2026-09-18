import {computeFinalScore, sortScoredBlocks} from './finalScoreWeights';

// Веса и breakdown - из примера бэкенда (задача сортировки/переключателей
// стиля в /interviews/:id), чтобы формула на клиенте не разошлась со счётом
// сервиса оценки.
const WEIGHTS = {
    relevance: 1, depth: 1, fact_verify: 1.5, practice: 2.5, style: 0.5,
    fillers: -0.5, critical_error: -1.5, offtop: -10,
};
const BREAKDOWN = {
    depth: {value: 0.9, weighted: 0.9},
    style: {value: 1, weighted: 0.5},
    offtop: {value: 0, weighted: 0},
    fillers: {value: 0, weighted: 0},
    practice: {value: 0.5750000000000001, weighted: 0.8625},
    relevance: {value: 1, weighted: 1},
    fact_verify: {value: 0.7833333333333333, weighted: 1.5666666666666667},
    critical_error: {value: 0, weighted: 0},
};

describe('computeFinalScore', () => {
    it('считает балл по весам как есть', () => {
        expect(computeFinalScore(BREAKDOWN, WEIGHTS, [])).toBe(7.7);
    });

    it('выключенный компонент выпадает из числителя и знаменателя базы', () => {
        expect(computeFinalScore(BREAKDOWN, WEIGHTS, ['style'])).toBe(7.5);
    });

    it('штраф снимает балл сверх базы, а не входит в неё', () => {
        let breakdown = {...BREAKDOWN, critical_error: {value: 1, weighted: -1.5}};
        let score = computeFinalScore(breakdown, WEIGHTS, []);
        expect(score).toBeLessThan(computeFinalScore(BREAKDOWN, WEIGHTS, []));
    });

    it('итог зажат в 0..10', () => {
        let weights = {a: 1};
        expect(computeFinalScore({a: {value: 1}}, weights, [])).toBeLessThanOrEqual(10);
        expect(computeFinalScore({a: {value: 0}}, weights, [])).toBeGreaterThanOrEqual(0);
    });

    it('нет breakdown/weights - пустые входы не падают', () => {
        expect(computeFinalScore(null, null, [])).toBe(0);
        expect(computeFinalScore({}, {}, [])).toBe(0);
    });

    it('отсутствующий в весах компонент (напр. llm) просто пропускается', () => {
        let weights = {...WEIGHTS, llm: 1};
        expect(computeFinalScore(BREAKDOWN, weights, [])).toBe(7.7);
    });
});

describe('sortScoredBlocks', () => {
    let blocks = [
        {key: 'a', evaluation: {state: 'done', score: 5}},
        {key: 'b', evaluation: {state: 'done', score: 9}},
        {key: 'c', soft: {state: 'done', score: 3}},
        {key: 'd', evaluation: {state: 'pending', score: null}},
    ];

    it('default - порядок не меняется', () => {
        expect(sortScoredBlocks(blocks, 'default').map(b => b.key)).toEqual(['a', 'b', 'c', 'd']);
    });

    it('desc - от высокого к низкому, неоценённые в конце', () => {
        expect(sortScoredBlocks(blocks, 'desc').map(b => b.key)).toEqual(['b', 'a', 'c', 'd']);
    });

    it('asc - от низкого к высокому, неоценённые тоже в конце', () => {
        expect(sortScoredBlocks(blocks, 'asc').map(b => b.key)).toEqual(['c', 'a', 'b', 'd']);
    });
});
