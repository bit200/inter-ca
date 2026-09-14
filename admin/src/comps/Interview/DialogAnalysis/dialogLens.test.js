import {attachAnswers, lensDimmed, technicalAverage, timelineSegments, withoutAnswer} from './dialogLens';

const turns = [
    {id: 't1', role: 'manager', startMs: 0, endMs: 3000, text: 'Что такое замыкание?'},
    {id: 't2', role: 'manager', startMs: 3000, endMs: 5000, text: 'Как работает this?'},
    {id: 't3', role: 'client', startMs: 5000, endMs: 10000, text: 'Функция помнит окружение'},
];

const block = (key, technical, indexes, evaluation = {state: 'missing'}) => ({
    key,
    technical,
    number: Number(key.slice(1)),
    items: indexes.map(index => ({turn: turns[index], index, followUp: false})),
    startMs: turns[indexes[0]].startMs,
    endMs: turns[indexes[indexes.length - 1]].endMs,
    evaluation,
});

describe('линзы расшифровки', () => {
    test('линза гасит вопросы не своей темы', () => {
        expect(lensDimmed('all', true)).toBe(false);
        expect(lensDimmed('tech', false)).toBe(true);
        expect(lensDimmed('tech', true)).toBe(false);
        expect(lensDimmed('behavior', true)).toBe(true);
    });

    test('технический балл - среднее по оценённым техническим вопросам на шкале из 10', () => {
        expect(technicalAverage([block('q1', true, [0], {state: 'missing'})])).toBeNull();
        expect(technicalAverage([
            block('q1', true, [0], {state: 'done', score: 8, max: 10}),
            block('q2', true, [1], {state: 'done', score: 2, max: 5}),
            block('q3', false, [2], {state: 'done', score: 1, max: 10}),
        ])).toEqual({score: 6, max: 10, count: 2});
    });

    test('отрезки шкалы - доли длительности интервью', () => {
        expect(timelineSegments([block('q1', true, [0, 1])], 10000)).toEqual([
            {key: 'q1', number: 1, technical: true, startMs: 0, left: 0, width: 50},
        ]);
        expect(timelineSegments([block('q1', true, [0])], 0)).toEqual([]);
    });

    test('реплика кандидата, сделанная ответом, переезжает в вопрос без ответа', () => {
        let blocks = [block('q1', true, [0]), block('q2', true, [1, 2])];
        expect(withoutAnswer(blocks[0])).toBe(true);

        let linked = attachAnswers(blocks, {q1: [2]}, turns);
        expect(linked[0].items.map(item => item.index)).toEqual([0, 2]);
        expect(withoutAnswer(linked[0])).toBe(false);
        expect(linked[1].items.map(item => item.index)).toEqual([1]);
        expect(withoutAnswer(linked[1])).toBe(true);
    });
});
