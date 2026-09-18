import {countDisfluencies, isScoredBlock, isStyleMetric, deliveryBreakdown, questionRemarks, questionTitle, readQaBlocks, scoreBand, shortQuestionTitle, softBreakdown, softHints, softProblemMarks} from './qaBlocks';
import {DEFAULT_SOFT_WEIGHTS} from './softScoreWeights';
import {behaviorCounts, behaviorScore, withoutAnswer} from './dialogLens';

const turns = [
    {id: 't1', role: 'manager', startMs: 0, endMs: 3000, text: 'Что такое замыкание?'},
    {id: 't2', role: 'client', startMs: 3000, endMs: 9000, text: 'Функция с доступом к внешней области'},
    {id: 't3', role: 'manager', startMs: 9000, endMs: 11000, text: 'А где это пригодится?'},
    {id: 't4', role: 'client', startMs: 11000, endMs: 15000, text: 'В фабриках функций'},
];

describe('Q&A-блоки оценки ответов', () => {
    it('неоцениваемый вопрос isScoredBlock отсекает, оцениваемые и ждущие оценки оставляет', () => {
        let blocks = readQaBlocks({blocks: [
            {id: 'b1', technical: true, turnIndexes: [0, 1], evaluation: {score: 8}},
            {id: 'b2', technical: false, turnIndexes: [2, 3]},
            {id: 'b3', technical: false, turnIndexes: [2, 3], softEvaluate: {relevance: 'on_topic', complete: true}},
        ]}, turns);
        expect(blocks.filter(isScoredBlock).map(block => block.key)).toEqual([blocks[0].key, blocks[2].key]);
    });

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
        let content = block => softBreakdown(block.soft).content;
        expect(blocks[0].soft).toMatchObject({state: 'done', relevance: 'on_topic', complete: true, engaged: null, note: 'По делу', band: 'good', max: 10});
        expect(content(blocks[0])).toBe(10);
        expect(blocks[1].soft.band).toBe('fair');
        expect(content(blocks[1])).toBe(6);
        expect(blocks[2].soft.band).toBe('poor');
        expect(content(blocks[2])).toBe(0);
        expect(blocks[3].soft).toBeNull();
    });

    it('балл содержания из 10 не выходит из полосы уровня ответа', () => {
        let soft = softEvaluate => {
            let value = readQaBlocks([{technical: false, turnIndexes: [0, 1], softEvaluate}], turns)[0].soft;
            return {band: value.band, content: softBreakdown(value).content, max: value.max};
        };
        expect(soft({relevance: 'on_topic', complete: true, engaged: true}).content).toBe(10);
        expect(soft({relevance: 'on_topic'})).toMatchObject({band: 'good', content: 9});
        expect(soft({relevance: 'on_topic', complete: false, engaged: true})).toMatchObject({band: 'fair', content: 6});
        expect(soft({relevance: 'evasive', complete: false})).toMatchObject({band: 'fair', content: 4});
        expect(soft({relevance: 'off_topic', complete: true, engaged: true})).toMatchObject({band: 'poor', content: 3});
        [soft({relevance: 'evasive', complete: true}), soft({relevance: 'off_topic', complete: false})]
            .forEach(value => expect(scoreBand(value.content, value.max)).toBe(value.band));
    });

    it('веса мягкой оценки из админки меняют очки отметок, штрафы подачи и доли частей', () => {
        let weights = {...DEFAULT_SOFT_WEIGHTS, content: 0.5, delivery: 0.5, on_topic: 8, evasive: 4, complete: 2,
            engaged: 0, fillers: 3, disfluencies: 1, delay: 4, inner_pauses: 0};
        let evaluation = {relevance: 'evasive', complete: true, engaged: null, band: 'fair',
            delivery: {words: 40, fillers: 4, disfluencies: 2, delayMs: 5000, innerPauses: 2}};
        let breakdown = softBreakdown(evaluation, weights);
        expect(breakdown.rows.map(row => [row.key, row.points, row.max])).toEqual([['relevance', 4, 8], ['complete', 2, 2]]);
        // 6 очков из 10 возможных - 6 из 10; полоса «уклончиво» 4-6 не мешает.
        expect(breakdown).toMatchObject({raw: 6, content: 6, weights: {content: 0.5, delivery: 0.5}});
        // Паразиты 10 на 100 слов - весь вес 3, сбои до 1, долгая пауза - половина веса 4, паузы в ответе - 0.
        expect(breakdown.delivery.rows.map(row => row.penalty)).toEqual([3, 1, 2, 0]);
        expect(breakdown.delivery.score).toBe(4);
        // 6 * (0.5 + 0.5 * 0.4) = 4.2
        expect(breakdown.score).toBe(4.2);

        let [block] = readQaBlocks([{technical: false, turnIndexes: [0, 1], softEvaluate: {relevance: 'on_topic', complete: false}}],
            turns, {softWeights: {...DEFAULT_SOFT_WEIGHTS, on_topic: 9, complete: 1}});
        // Формально по теме: 9 из 11 = 8.2, зажато полосой «формально» до 6.
        expect(block.soft.score).toBe(6);
        expect(softHints(weights).content).toMatch('Даёт 50% итогового балла');
        expect(softHints(weights).relevance).toMatch('по теме - 8 баллов, уклончиво - 4');
    });

    it('детализация мягкой оценки раскладывает балл на слагаемые и поправку полосой', () => {
        let soft = softEvaluate => readQaBlocks([{technical: false, turnIndexes: [0, 1], softEvaluate}], turns)[0].soft;
        let full = softBreakdown(soft({relevance: 'on_topic', complete: true}));
        expect(full.rows.map(row => [row.label, row.points, row.max])).toEqual([
            ['По теме', 6, 6], ['Развёрнуто', 4, 4],
        ]);
        expect(full).toMatchObject({raw: 10, content: 10, max: 10});

        let formal = soft({relevance: 'on_topic', complete: false, engaged: true});
        expect(softBreakdown(formal)).toMatchObject({raw: 7, content: 6, score: formal.score});
        expect(softBreakdown(soft({relevance: 'evasive', complete: false}))).toMatchObject({raw: 3, content: 4});
    });

    it('встречные вопросы учитываются, только если применимы: нет повода - нет и слагаемого', () => {
        let soft = softEvaluate => readQaBlocks([{technical: false, turnIndexes: [0, 1], softEvaluate}], turns)[0].soft;
        let rows = value => softBreakdown(value).rows.map(row => [row.label, row.points, row.max]);

        let needless = soft({relevance: 'on_topic', complete: true, engaged: null});
        expect(rows(needless)).toEqual([['По теме', 6, 6], ['Развёрнуто', 4, 4]]);
        expect(softBreakdown(needless).content).toBe(10);

        let missed = soft({relevance: 'on_topic', complete: true, engaged: false});
        expect(rows(missed)).toEqual([['По теме', 6, 6], ['Развёрнуто', 3, 3], ['Без встречных вопросов', 0, 1]]);
        expect(softBreakdown(missed).content).toBe(9);

        let asked = soft({relevance: 'on_topic', complete: true, engaged: true});
        expect(rows(asked)).toEqual([['По теме', 6, 6], ['Развёрнуто', 3, 3], ['Встречные вопросы', 1, 1]]);
        expect(softBreakdown(asked).content).toBe(10);
    });

    it('блок, который открыл сам кандидат, не штрафуется за встречные вопросы', () => {
        let led = readQaBlocks([{technical: false, turnIndexes: [1, 2, 3],
            softEvaluate: {relevance: 'on_topic', complete: true, engaged: false}}], turns)[0].soft;
        expect(led.engaged).toBeNull();
        expect(softBreakdown(led).rows.map(row => row.label)).toEqual(['По теме', 'Развёрнуто']);
        expect(softBreakdown(led).content).toBe(10);
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

    it('блок открыл кандидат - заголовок его вопрос, а не обрывок ответа интервьюера', () => {
        let feed = [
            {id: 's1', role: 'client', startMs: 0, endMs: 16000, text: 'Процесс работы спрошу у вас. Scrum стандартный, спринты?'},
            {id: 's2', role: 'manager', startMs: 13000, endMs: 13400, text: 'у'},
            {id: 's3', role: 'manager', startMs: 15000, endMs: 25000, text: 'Есть встречки с грумингом и планированием.'},
            {id: 's4', role: 'client', startMs: 20000, endMs: 20400, text: 'планированием,'},
        ];
        let [block] = readQaBlocks([{turnIds: ['s1', 's2', 's3', 's4'], technical: false, question: feed[0].text}], feed);
        expect(questionTitle(block)).toBe('Процесс работы спрошу у вас. Scrum стандартный, спринты?');
    });

    it('короткая версия вопроса для шапки короче полной реплики', () => {
        let long = 'пока что, да. К сожалению, я не смогу сориентироваться, поскольку мы сотрудничаем как с средним, так и крупным бизнесом. То есть тут я не смогу даже близко, наверное, делать что-то как-то на том же.';
        let short = shortQuestionTitle(long);
        expect(short).toBe('К сожалению, я не смогу сориентироваться, поскольку мы сотрудничаем…');
        expect(short.length).toBeLessThanOrEqual(71);
        expect(shortQuestionTitle('Хорошо, спасибо. Мы уже обсудили стек, а теперь расскажите, как вы тестируете код? Можно коротко.'))
            .toBe('Мы уже обсудили стек, а теперь расскажите, как вы тестируете код?');
        expect(shortQuestionTitle('Что такое замыкание?')).toBe('Что такое замыкание?');
        expect(shortQuestionTitle('')).toBe('');
    });
});

describe('подача нетехнического ответа', () => {
    // Ответ из интервью 1003: по смыслу верный, но с паразитами и самоперебивом.
    const speech = [
        {id: 'q', role: 'manager', startMs: 0, endMs: 14000, text: 'Расскажи, с чем принял решение выйти на рынок?'},
        {id: 'a1', role: 'client', startMs: 16500, endMs: 25000, markerIds: ['f1', 'f2'],
            text: 'У меня… Я был в Омске раньше, и у меня офис, ну, один из, так сказать, офисов этой'},
        {id: 'a2', role: 'client', startMs: 25000, endMs: 30000, text: 'располагался в Омске. Я работал, соответственно,'},
        {id: 'a3', role: 'client', startMs: 30000, endMs: 37000, markerIds: ['f3'], text: 'приходя в офис. А сейчас я переехал, и, ну,'},
        {id: 'a4', role: 'client', startMs: 37000, endMs: 41000, text: 'них нет такой возможности'},
        {id: 'a5', role: 'client', startMs: 41000, endMs: 46000, markerIds: ['f4', 'e1'], text: 'работать удаленно, и поэтому вот я сейчас и ищу работу.'},
    ];
    const markers = ['f1', 'f2', 'f3', 'f4'].map(id => ({id, category: 'filler'})).concat({id: 'e1', category: 'empathy'});
    const read = (turnsList, options) => readQaBlocks([{technical: false, turnIndexes: turnsList.map((_, index) => index),
        timing: {responseDelayMs: 2500}, softEvaluate: {relevance: 'on_topic', complete: true}}], turnsList, {markers, ...options})[0].soft;

    it('верный по смыслу ответ с паразитами и запинкой больше не получает 10 из 10', () => {
        let soft = read(speech);
        expect(soft.delivery).toEqual({words: 47, fillers: 4, disfluencies: 1, delayMs: 2500, innerPauses: 0});
        let breakdown = softBreakdown(soft);
        expect(breakdown.content).toBe(10);
        expect(breakdown.delivery.rows.map(row => [row.label, row.penalty])).toEqual([
            ['4 паразита на 47 слов', 4], ['1 речевой сбой', 1], ['Пауза перед ответом 2,5 с', 0],
        ]);
        expect(breakdown.delivery.score).toBe(5);
        expect(soft.score).toBe(8.5);
        expect(soft.score).toBe(breakdown.score);
    });

    it('штраф за паразитов - по плотности на 100 слов, а не по штукам', () => {
        let penalty = (fillers, words) => deliveryBreakdown({words, fillers}).rows[0].penalty;
        expect(penalty(4, 200)).toBe(0);
        expect(penalty(3, 100)).toBe(2);
        expect(penalty(6, 100)).toBe(4);
        expect(penalty(4, 40)).toBe(6);
    });

    it('речевые сбои: мычание, повтор слова, самоперебив и оборванная фраза', () => {
        expect(countDisfluencies(['Я пишу на js и на Go.'])).toBe(0);
        expect(countDisfluencies(['Эээ, я я пишу'])).toBe(2);
        expect(countDisfluencies(['У меня… Я был', 'офисов этой…'])).toBe(2);
        expect(deliveryBreakdown({words: 50, disfluencies: 5}).rows[1]).toMatchObject({penalty: 3});
    });

    it('долгая пауза перед ответом и паузы внутри ответа снижают подачу', () => {
        let clean = [speech[0], {...speech[4], startMs: 20000, endMs: 22000}, {...speech[4], id: 'x', startMs: 26000, endMs: 28000}];
        let soft = read(clean);
        expect(soft.delivery).toMatchObject({innerPauses: 1, delayMs: 2500});
        let rows = softBreakdown(soft).delivery.rows;
        expect(rows.find(row => row.key === 'innerPauses')).toMatchObject({label: '1 долгая пауза в ответе', penalty: 1});
        expect(deliveryBreakdown({words: 10, delayMs: 5000}).rows[2]).toMatchObject({penalty: 1});
        expect(deliveryBreakdown({words: 10, delayMs: 9000}).rows[2]).toMatchObject({penalty: 2});
    });

    it('подача не поднимает ответ мимо вопроса: снимает только с заработанного', () => {
        let off = softBreakdown({relevance: 'off_topic', complete: false, band: 'poor', delivery: {words: 20}});
        expect(off).toMatchObject({content: 0, score: 0});
        let fine = softBreakdown({relevance: 'on_topic', complete: true, band: 'good', delivery: {words: 20}});
        expect(fine).toMatchObject({content: 10, score: 10});
    });
    it('в строке вопроса нетехнический ответ показывает только проблемные отметки, зелёные скрыты', () => {
        let texts = soft => softProblemMarks(soft).map(mark => [mark.text, mark.tone]);
        expect(texts({relevance: 'on_topic', complete: true, engaged: true})).toEqual([]);
        expect(texts({relevance: 'evasive', complete: false})).toEqual([['Уклончиво', 'fair'], ['Формально', 'fair']]);
        expect(texts({relevance: 'off_topic', complete: null})).toEqual([['Не по вопросу', 'poor']]);
    });
    describe('замечания к вопросу бейджами', () => {
        let texts = block => questionRemarks(block).map(mark => [mark.text, mark.tone]);
        let technical = evaluation => readQaBlocks({blocks: [{technical: true, turnIndexes: [0, 1], evaluate: {score: 3, evaluation}}]}, turns)[0];

        it('технический: только явные замечания из оценки - одно, если оно одно', () => {
            expect(texts(technical({errors: {is_critical: 1, errors: ['Путает замыкание с классом']}}))).toEqual([['Критическая ошибка', 'poor']]);
            expect(questionRemarks(technical({errors: {is_critical: 1, errors: ['Путает замыкание с классом']}}))[0].hint).toBe('Путает замыкание с классом');
            expect(texts(technical({relevance: {is_offtop: 1}, errors: {is_critical: 0, errors: ['Неверный термин']}, practice: {count: 0}})))
                .toEqual([['Уход от темы', 'poor'], ['Неточности', 'fair'], ['Без примеров из практики', 'fair']]);
            // Низкая глубина без явного вывода оценки замечанием не считается.
            expect(texts(technical({depth: {depth_score: 2}, relevance: {is_offtop: 0}, practice: {count: 2}}))).toEqual([]);
        });

        it('технический: проваленные показатели выводятся все, а не один флаг практики', () => {
            let schemas = [
                {key: 'evaluation.depth.depth_score', group: 'Глубина', min: 0, max: 10},
                {key: 'evaluation.speech.clarity', group: 'Речь', min: 0, max: 10},
                {key: 'evaluation.practice.count', group: 'Практика', min: 0, max: 10},
                {key: 'evaluation.relevance.relevance', group: 'Релевантность', min: 0, max: 10},
                // Итог виден баллом рядом - бейджем не дублируется.
                {key: 'score', group: 'Итог', min: 0, max: 10},
            ];
            let block = technical({depth: {depth_score: 1}, speech: {clarity: 1}, practice: {count: 0}, relevance: {relevance: 9, is_offtop: 0}});
            expect(questionRemarks(block, schemas).map(mark => mark.text))
                .toEqual(['Без примеров из практики', 'Глубина', 'Речь']);
            // Без схем показателей - только явные флаги, как раньше.
            expect(texts(block)).toEqual([['Без примеров из практики', 'fair']]);
        });

        it('нетехнический: проблемные отметки мягкой оценки', () => {
            let [block] = readQaBlocks({blocks: [{technical: false, turnIndexes: [2, 3], softEvaluate: {relevance: 'evasive', complete: true}}]}, turns);
            expect(texts(block)).toEqual([['Уклончиво', 'fair']]);
        });

        it('без готовой оценки замечаний нет', () => {
            let [block] = readQaBlocks({blocks: [{technical: true, turnIndexes: [0, 1]}]}, turns, {active: true});
            expect(questionRemarks(block)).toEqual([]);
        });
    });

    describe('пересчёт итогового балла по weights/breakdown (finalScoreWeights.js)', () => {
        let weights = {relevance: 1, depth: 1, style: 0.5, offtop: -10};
        let breakdown = {
            relevance: {value: 1, weighted: 1},
            depth: {value: 0.9, weighted: 0.9},
            style: {value: 1, weighted: 0.5},
            offtop: {value: 0, weighted: 0},
        };
        let raw = {blocks: [{id: 'b1', technical: true, turnIndexes: [0, 1],
            evaluate: {score: 5, result: {score: 5, weights, breakdown}}}]};

        it('без выключенных компонентов балл сервиса не трогаем', () => {
            let [block] = readQaBlocks(raw, turns);
            expect(block.evaluation.score).toBe(5);
            expect(block.evaluation.originalScore).toBe(null);
        });

        it('style в disabledTechnical пересчитывает балл по оставшимся весам', () => {
            let [block] = readQaBlocks(raw, turns, {disabledTechnical: new Set(['style'])});
            // relevance(1*1) + depth(0.9*1), знаменатель без style: (1+0.9)/2*10 = 9.5.
            expect(block.evaluation.score).toBeCloseTo(9.5, 5);
            expect(block.evaluation.originalScore).toBe(5);
        });

        it('нет ни весов, ни схем показателей - выключение ни на что не влияет', () => {
            let plain = {blocks: [{id: 'b1', technical: true, turnIndexes: [0, 1], evaluate: {score: 7}}]};
            let [block] = readQaBlocks(plain, turns, {disabledTechnical: new Set(['style'])});
            expect(block.evaluation.score).toBe(7);
        });
    });

    // Сервис оценки весов и слагаемых балла не присылает - только сам балл и
    // показатели evaluation.*, поэтому «не учитывать стиль ответа» считается по
    // ним: балл двигается на ту же долю, что и средний процент групп без стилевых.
    describe('пересчёт балла по показателям оценки (без weights/breakdown)', () => {
        let metricSchemas = [
            {key: 'score', group: 'Итог', min: 0, max: 10},
            {key: 'evaluation.relevance.relevance', group: 'Релевантность', min: 0, max: 10},
            {key: 'evaluation.depth.depth_score', group: 'Глубина', min: 0, max: 10},
            {key: 'evaluation.speech.clarity', group: 'Речь', min: 0, max: 10},
        ];
        let raw = {blocks: [{id: 'b1', technical: true, turnIndexes: [0, 1], evaluate: {score: 8, result: {score: 8,
            evaluation: {relevance: {relevance: 6}, depth: {depth_score: 5}, speech: {clarity: 10}}}}}]};

        it('style выключен - балл падает вслед за показателями без стилевых групп', () => {
            let [block] = readQaBlocks(raw, turns, {disabledTechnical: new Set(['style']), metricSchemas});
            // Все группы: (60 + 50 + 100) / 3 = 70%, без «Речи»: (60 + 50) / 2 = 55%.
            expect(block.evaluation.score).toBeCloseTo(8 * 55 / 70, 1);
            expect(block.evaluation.originalScore).toBe(8);
        });

        it('балл плоский, показатели во вложенном result - пересчёт всё равно идёт', () => {
            let nested = {blocks: [{id: 'b1', technical: true, turnIndexes: [0, 1], evaluate: {result: {score: 8,
                evaluation: {relevance: {relevance: 6}, depth: {depth_score: 5}, speech: {clarity: 10}}}}}]};
            let [block] = readQaBlocks(nested, turns, {disabledTechnical: new Set(['style']), metricSchemas});
            expect(block.evaluation.score).toBeCloseTo(8 * 55 / 70, 1);
        });

        it('style включён - балл сервиса как есть', () => {
            let [block] = readQaBlocks(raw, turns, {metricSchemas});
            expect(block.evaluation.score).toBe(8);
            expect(block.evaluation.originalScore).toBe(null);
        });

        it('стилевых показателей в схемах нет - пересчитывать нечего', () => {
            let [block] = readQaBlocks(raw, turns, {disabledTechnical: new Set(['style']),
                metricSchemas: metricSchemas.filter(schema => schema.group !== 'Речь')});
            expect(block.evaluation.score).toBe(8);
            expect(block.evaluation.originalScore).toBe(null);
        });

        it('стилевые показатели узнаются и по ключу, и по русской группе', () => {
            expect(isStyleMetric({key: 'evaluation.speech.clarity', group: 'Глубина'})).toBe(true);
            expect(isStyleMetric({key: 'evaluation.fillers.count', group: ''})).toBe(true);
            expect(isStyleMetric({key: 'evaluation.custom.value', group: 'Речь'})).toBe(true);
            expect(isStyleMetric({key: 'evaluation.practice.count', group: 'Практика'})).toBe(false);
        });
    });
});
