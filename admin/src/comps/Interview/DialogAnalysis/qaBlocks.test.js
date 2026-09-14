import {readQaBlocks, scoreBand} from './qaBlocks';

const turns = [
    {id: 't1', role: 'manager', startMs: 0, endMs: 3000, text: 'Что такое замыкание?'},
    {id: 't2', role: 'client', startMs: 3000, endMs: 9000, text: 'Функция с доступом к внешней области'},
    {id: 't3', role: 'manager', startMs: 9000, endMs: 11000, text: 'А где это пригодится?'},
    {id: 't4', role: 'client', startMs: 11000, endMs: 15000, text: 'В фабриках функций'},
];

describe('Q&A-блоки оценки ответов', () => {
    it('блок по индексам реплик берёт их из ленты и отмечает уточнение', () => {
        let [block] = readQaBlocks({blocks: [{id: 'b1', technical: true, turnIndexes: [0, 1, 2, 3], evaluation: {score: 8, feedback: 'Точно'}}]}, turns);
        expect(block.items.map(item => item.index)).toEqual([0, 1, 2, 3]);
        expect(block.items.map(item => item.followUp)).toEqual([false, false, true, false]);
        expect(block.startMs).toBe(0);
        expect(block.endMs).toBe(15000);
        expect(block.evaluation).toMatchObject({state: 'done', score: 8, max: 10, feedback: 'Точно'});
    });

    it('ссылки id, текстовые блоки и форма мок-интервью читаются одинаково', () => {
        let blocks = readQaBlocks([
            {turnIds: ['t3', 't4'], isTechnical: false},
            {question: 'Расскажите о себе', answer: 'Пишу на js', classification: 'technical'},
            {dialog: [{text: 'Что такое event loop?', isMain: true}, {text: 'Очередь задач'}, {text: 'А микрозадачи?', isMain: false}]},
        ], turns);
        expect(blocks[0].items.map(item => item.index)).toEqual([2, 3]);
        expect(blocks[0].technical).toBe(false);
        expect(blocks[0].evaluation.state).toBe('skipped');
        expect(blocks[1].technical).toBe(true);
        expect(blocks[1].items.map(item => item.turn.role)).toEqual(['manager', 'client']);
        expect(blocks[2].technical).toBe(null);
        expect(blocks[2].items[2].followUp).toBe(true);
    });

    it('технический блок без балла - оценивается, пока идёт пайплайн, и с ошибкой - когда сервис упал', () => {
        let raw = {blocks: [{technical: true, turnIndexes: [0, 1]}, {technical: true, turnIndexes: [2, 3], evaluation: {status: 'error', error: {message: 'таймаут'}}}]};
        let [pending, failed] = readQaBlocks(raw, turns, {active: true});
        expect(pending.evaluation.state).toBe('pending');
        expect(failed.evaluation).toMatchObject({state: 'error', message: 'таймаут'});
        expect(readQaBlocks(raw, turns)[0].evaluation.state).toBe('missing');
    });

    it('блок без реплик не показывается', () => {
        expect(readQaBlocks({blocks: [{turnIndexes: [99]}]}, turns)).toEqual([]);
        expect(readQaBlocks(null, turns)).toEqual([]);
    });

    it('уровень балла', () => {
        expect(scoreBand(8, 10)).toBe('good');
        expect(scoreBand(5, 10)).toBe('fair');
        expect(scoreBand(2, 10)).toBe('poor');
        expect(scoreBand(null, 10)).toBe('none');
    });
});
