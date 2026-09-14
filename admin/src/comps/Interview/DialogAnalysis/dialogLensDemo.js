// ДЕМО-ЗАГЛУШКИ линз расшифровки. Всё в этом файле - выдуманные значения под
// функционал, которого на бэкенде ещё нет. Экран показывает их через <Demo>:
// пунктирная обводка и попап «ДЕМО ЗНАЧЕНИЕ» при наведении, чтобы на ревью было
// сразу видно, что это не настоящая оценка. Значения детерминированы от ключа
// реплики/вопроса, чтобы не прыгали между рендерами.
//
// Когда функционал появится, соответствующая функция отсюда удаляется, а
// значение читается из answersEvaluation (схема - раздел «Что нужно от оценки
// ответов» в docs/design/dialog-evaluation-concepts.html), обёртка <Demo> снимается.

export const DEMO_LABEL = 'ДЕМО ЗНАЧЕНИЕ';

function seed(key) {
    let text = String(key);
    let hash = 7;
    for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) % 100003;
    return hash;
}

// Балл отдельного звена цепочки - ответа кандидата на вопрос или уточнение.
// Должен работать так: evaluate оценивает не блок целиком, а каждую пару
// вопрос→ответ и уточнение→ответ, и отдаёт answersEvaluation.blocks[].links[]
// = {questionTurn, answerTurn, score, maxScore}. Балл встаёт у реплики кандидата.
export function demoAnswerScore(key) {
    return 3 + seed(key) % 8;
}

// Нетехническая оценка за интервью (0-10). Должна работать так: отдельный шаг
// оценки считает поведение кандидата - пропуски, уход от ответа, вежливость,
// серии пропусков - и отдаёт answersEvaluation.behavior = {score, maxScore}.
export function demoBehaviorScore(turns) {
    return 4 + seed((turns || []).length) % 5;
}

// Флаги поведения на репликах кандидата. Должны работать так: шаг оценки
// поведения размечает реплики - answersEvaluation.behavior.flags[] =
// {turnIndex, kind: 'evasive' | 'rude', reason}; человек может снять флаг
// кнопкой «Не согласен», и это сохраняется в интервью.
export const BEHAVIOR_FLAG_LABELS = {evasive: 'Ушёл от ответа', rude: 'Невежливо'};

export function demoBehaviorFlags(turns) {
    let flags = new Map();
    (turns || []).forEach((turn, index) => {
        if (!turn || turn.role !== 'client') return;
        let value = seed(turn.id || index) % 6;
        if (value === 5) flags.set(index, 'rude');
        else if (value === 3) flags.set(index, 'evasive');
    });
    return flags;
}

export function demoBehaviorCounts(flags) {
    let counts = {evasive: 0, rude: 0};
    flags.forEach(kind => { counts[kind] += 1; });
    return counts;
}

// Серия пропусков: несколько вопросов подряд без ответа. Должна приходить из
// оценки поведения как answersEvaluation.behavior.series[] = {fromBlock, toBlock};
// у первого вопроса серии в шапке встаёт отметка «Серия пропусков».
export function demoSkipSeries(block) {
    return block && block.technical === false && seed(block.key) % 4 === 1;
}

// Разбивка расшифровки на вопросы, пока оценки ответов нет (не запускали, идёт
// или ручка api не отдала блоков). Без неё вариант B не видно вовсе: шкала,
// скобки цепочек, линзы и «Ответ не найден» строятся по вопросам. Должна
// работать так: шаг grouping оценки ответов отдаёт answersEvaluation.result.blocks[] =
// {id, technical, turnIndexes, evaluation: {score, maxScore}} - тогда эта функция
// удаляется, а экран берёт настоящие блоки. Здесь реплика интервьюера с вопросом
// после ответа кандидата открывает новый вопрос; тема и балл выдуманы.
export function demoQaBlocks(turns) {
    let feed = Array.isArray(turns) ? turns : [];
    let group = asksOnly => {
        let blocks = [];
        let current = null;
        let answered = false;
        feed.forEach((turn, index) => {
            if (!turn) return;
            let client = turn.role === 'client';
            let asks = !asksOnly || String(turn.text || '').includes('?');
            if (!current || (!client && answered && asks)) {
                current = {id: 'demo-q' + blocks.length, turnIndexes: []};
                blocks.push(current);
                answered = false;
            }
            current.turnIndexes.push(index);
            answered = answered || client;
        });
        return blocks;
    };
    // Распознавание не всегда ставит «?» - тогда делим по смене говорящего.
    let blocks = group(true);
    if (blocks.length < 2) blocks = group(false);

    return blocks.map((block, position) => {
        let technical = position > 0 && seed(block.id) % 3 !== 0;
        return technical
            ? {...block, technical, evaluation: {score: demoAnswerScore(block.id), maxScore: 10}}
            : {...block, technical};
    });
}
