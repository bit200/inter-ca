import {
    answerScores,
    attachAnswers,
    behaviorCounts,
    behaviorFlags,
    behaviorScore,
    lensDimmed,
    liveCodingSegments,
    skipSeriesStarts,
    technicalAverage,
    timelineSegments,
    withoutAnswer,
} from './dialogLens';

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

    test('подряд идущие реплики live-coding склеиваются в один отрезок шкалы', () => {
        let feed = [
            {startMs: 0, endMs: 1000},
            {startMs: 1000, endMs: 2000, liveCoding: true},
            {startMs: 2000, endMs: 5000, liveCoding: true},
            {startMs: 5000, endMs: 6000},
            {startMs: 8000, endMs: 9000, liveCoding: true},
        ];
        expect(liveCodingSegments(feed, 10000)).toEqual([
            {key: 'live-1000', startMs: 1000, endMs: 5000, left: 10, width: 40},
            {key: 'live-8000', startMs: 8000, endMs: 9000, left: 80, width: 10},
        ]);
        expect(liveCodingSegments(feed, 0)).toEqual([]);
        expect(liveCodingSegments([{startMs: 0, endMs: 1000}], 10000)).toEqual([]);
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

    // Значения панели линз считаются из настоящей оценки ответов, а не выдумываются.
    describe('оценки из оценки ответов', () => {
        const feed = [
            {id: 'a', role: 'manager', text: 'Почему уходите?'},
            {id: 'b', role: 'client', text: 'Ну так'},
            {id: 'c', role: 'manager', text: 'Что такое замыкание?'},
            {id: 'd', role: 'client', text: 'Функция'},
            {id: 'e', role: 'client', text: 'с окружением'},
            {id: 'f', role: 'manager', text: 'Какая вилка?'},
            {id: 'g', role: 'manager', text: 'Когда готовы выйти?'},
            {id: 'h', role: 'client', text: 'Про погоду'},
        ];
        const make = (key, technical, indexes, extra = {}) => ({
            key,
            technical,
            items: indexes.map(index => ({turn: feed[index], index})),
            evaluation: {state: technical ? 'missing' : 'skipped'},
            soft: null,
            ...extra,
        });
        const blocks = [
            make('q1', false, [0, 1], {soft: {state: 'done', relevance: 'evasive', band: 'fair', score: 4, max: 10}}),
            make('q2', true, [2, 3, 4], {evaluation: {state: 'done', score: 3, max: 10}}),
            make('q3', true, [5]),
            make('q4', false, [6], {soft: {state: 'done', relevance: 'on_topic', band: 'good'}}),
            make('q5', false, [7], {soft: {state: 'done', relevance: 'off_topic', band: 'poor', score: 0, max: 10}}),
        ];

        test('балл вопроса стоит у последней реплики ответа - и у технического, и у нетехнического', () => {
            expect(Array.from(answerScores(blocks))).toEqual([
                [1, {score: 4, max: 10, technical: false}],
                [4, {score: 3, max: 10, technical: true}],
                [7, {score: 0, max: 10, technical: false}],
            ]);
        });

        test('флаги поведения - из мягкой оценки: уклончиво и не по вопросу', () => {
            let flags = behaviorFlags(blocks);
            expect(Array.from(flags)).toEqual([[1, 'evasive'], [7, 'off_topic']]);
            expect(behaviorCounts(blocks)).toEqual({unanswered: 2, evasive: 1, off_topic: 1});

            // Ответ без реплики кандидата флага не получает, но в счётчик попадает.
            let noClient = [make('q6', false, [6], {soft: {state: 'done', relevance: 'off_topic', band: 'poor'}})];
            expect(behaviorFlags(noClient).size).toBe(0);
            expect(behaviorCounts(noClient)).toEqual({unanswered: 1, evasive: 0, off_topic: 1});
        });

        test('нетехническая оценка - ответы по теме и развёрнуто из оценённых', () => {
            expect(behaviorScore(blocks)).toEqual({good: 1, count: 3});
            expect(behaviorScore([make('q1', false, [0])])).toBeNull();
        });

        test('серия пропусков отмечается у первого из двух и больше вопросов подряд без ответа', () => {
            expect(Array.from(skipSeriesStarts(blocks))).toEqual(['q3']);
            expect(Array.from(skipSeriesStarts([blocks[1], blocks[2]]))).toEqual([]);
        });
    });
});
