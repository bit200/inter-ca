import {questionTitle, readQaBlocks, scoreBand} from './qaBlocks';
import {behaviorCounts, behaviorScore, withoutAnswer} from './dialogLens';

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

describe('мягкая оценка нетехнических блоков', () => {
    it('отметки релевантности и полноты сводятся к полосе уровня', () => {
        let blocks = readQaBlocks({blocks: [
            {technical: false, turnIndexes: [0, 1], softEvaluate: {relevance: 'on_topic', complete: true, note: 'По делу'}},
            {technical: false, turnIndexes: [2, 3], softEvaluate: {relevance: 'evasive', complete: true}},
            {technical: false, turnIndexes: [0, 1], softEvaluate: {relevance: 'off_topic', complete: false}},
            {technical: true, turnIndexes: [2, 3], softEvaluate: {relevance: 'on_topic'}},
        ]}, turns);
        expect(blocks[0].soft).toEqual({state: 'done', relevance: 'on_topic', complete: true, engaged: null, note: 'По делу', band: 'good'});
        expect(blocks[1].soft.band).toBe('fair');
        expect(blocks[2].soft.band).toBe('poor');
        expect(blocks[3].soft).toBeNull();
    });

    it('без мягкой оценки блок ждёт её, пока идёт оценка, иначе не оценивается', () => {
        let block = {technical: false, turnIndexes: [0, 1]};
        expect(readQaBlocks([block], turns, {active: true})[0].soft.state).toBe('pending');
        expect(readQaBlocks([block], turns)[0].soft.state).toBe('skipped');
        expect(readQaBlocks([{...block, softEvaluate: {error: {message: 'llm недоступна'}}}], turns)[0].soft)
            .toEqual({state: 'error', message: 'llm недоступна'});
    });

    it('в блоке без реплики кандидата оценка не показывается - она судила бы интервьюера', () => {
        // Группировка отнесла уточнение интервьюера к «ответу», и модель оценила его слова.
        let evaluated = {technical: false, turnIndexes: [0, 2], softEvaluate: {relevance: 'off_topic', complete: false, note: 'Ответ кандидата бессмыслен'}};
        let [block] = readQaBlocks([evaluated], turns, {active: true});
        expect(block.soft).toEqual({state: 'unanswered'});
        expect(withoutAnswer(block)).toBe(true);
        expect(behaviorCounts([block])).toEqual({unanswered: 1, evasive: 0, off_topic: 0});
        expect(behaviorScore([block])).toBeNull();

        let [answered] = readQaBlocks([{...evaluated, turnIndexes: [0, 1]}], turns);
        expect(answered.soft.state).toBe('done');
        expect(withoutAnswer(answered)).toBe(false);
    });

    it('тайминг ответа берётся из метрик разговора по порядку блоков', () => {
        let [first, second] = readQaBlocks([{turnIndexes: [0, 1]}, {turnIndexes: [2, 3]}], turns, {
            timings: [{responseDelayMs: 400, answerDurationMs: 6000}],
        });
        expect(first.timing).toEqual({delayMs: 400, durationMs: 6000});
        expect(second.timing).toBeNull();
    });

    it('заголовок блока - текст основного вопроса, без него - номер', () => {
        let [block] = readQaBlocks([{turnIndexes: [1, 2, 3]}], turns);
        expect(questionTitle(block)).toBe('А где это пригодится?');
        let [asked] = readQaBlocks([{turnIndexes: [0, 1, 2]}], turns);
        expect(questionTitle(asked)).toBe('Что такое замыкание?');
        expect(questionTitle({number: 4, items: [{turn: {role: 'client', text: 'Ответ'}, followUp: false}]})).toBe('Вопрос 4');
    });
});
