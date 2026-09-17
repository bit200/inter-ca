// Линзы расшифровки (вариант B из docs/design/dialog-evaluation-concepts.html):
// одна лента, поверх неё - акцент на технике или на поведении, шкала времени
// интервью и связывание вопроса без ответа с репликой кандидата. Здесь только
// то, что считается из настоящих данных разбора и оценки ответов.

export const LENSES = [
    {key: 'all', label: 'Всё'},
    {key: 'tech', label: 'Техника'},
    {key: 'behavior', label: 'Поведение'},
];

// Линза гасит то, что к ней не относится: «Техника» - нетехнические вопросы,
// «Поведение» - технические. В «Всё» ничего не гасится.
export function lensDimmed(lens, technical) {
    if (lens === 'tech') return technical !== true;
    if (lens === 'behavior') return technical === true;
    return false;
}

export function showsTech(lens) {
    return lens !== 'behavior';
}

export function showsBehavior(lens) {
    return lens !== 'tech';
}

// Средний балл по оценённым техническим вопросам, приведённый к шкале из 10.
export function technicalAverage(blocks) {
    let done = (blocks || []).filter(block => block.technical === true
        && block.evaluation && block.evaluation.state === 'done');
    if (!done.length) return null;
    let sum = done.reduce((acc, block) => acc + block.evaluation.score / (block.evaluation.max || 10) * 10, 0);
    return {score: Math.round(sum / done.length * 10) / 10, max: 10, count: done.length};
}

// Вопрос с известной темой, в котором нет ни одной реплики кандидата: ответ либо
// пропущен, либо разбор отнёс его к другому вопросу - тогда его связывают руками.
export function withoutAnswer(block) {
    return Boolean(block) && typeof block.technical === 'boolean'
        && !block.items.some(item => item.turn && item.turn.role === 'client');
}

export function interviewDuration(summary, turns) {
    let total = Number(summary && summary.durationMs);
    if (isFinite(total) && total > 0) return total;
    let ends = (turns || []).map(turn => Number(turn.endMs || turn.startMs)).filter(isFinite);
    return ends.length ? Math.max(...ends) : 0;
}

function percent(ms, durationMs) {
    return Math.min(100, Math.max(0, ms / durationMs * 100));
}

// Отрезки вопросов на шкале интервью, в процентах от длительности.
export function timelineSegments(blocks, durationMs) {
    if (!durationMs) return [];
    return (blocks || []).filter(block => block.startMs !== null).map(block => {
        let end = block.endMs === null ? block.startMs : block.endMs;
        let left = percent(block.startMs, durationMs);
        return {
            key: block.key,
            number: block.number,
            technical: block.technical,
            startMs: block.startMs,
            left,
            width: Math.max(0.5, percent(end, durationMs) - left),
        };
    });
}

// Участки live-coding на шкале: подряд идущие реплики с флагом liveCoding
// (разметка разбора на api) склеиваются в один отрезок. Вопросов на них нет,
// поэтому без отметки эта часть шкалы выглядит пустой.
export function liveCodingSegments(turns, durationMs) {
    if (!durationMs) return [];
    let ranges = (turns || []).reduce((acc, turn, index) => {
        if (!turn || !turn.liveCoding) return acc;
        let startMs = Number(turn.startMs || 0);
        let endMs = Number(turn.endMs || turn.startMs || 0);
        let last = acc[acc.length - 1];
        if (last && last.lastIndex === index - 1) {
            return [...acc.slice(0, -1), {...last, endMs: Math.max(last.endMs, endMs), lastIndex: index}];
        }
        return [...acc, {startMs, endMs, lastIndex: index}];
    }, []);
    return ranges.map(range => {
        let left = percent(range.startMs, durationMs);
        return {
            key: 'live-' + range.startMs,
            startMs: range.startMs,
            endMs: range.endMs,
            left,
            width: Math.max(0.5, percent(range.endMs, durationMs) - left),
        };
    });
}

export function timelinePosition(ms, durationMs) {
    return durationMs ? percent(ms, durationMs) : 0;
}

// links - {ключ вопроса: [индексы реплик ленты]}: реплики кандидата, которые
// человек сделал ответом. Реплика переезжает в свой вопрос из прежнего, а
// опустевший вопрос пропадает из ленты.
export function attachAnswers(blocks, links, turns) {
    let value = links || {};
    let feed = Array.isArray(turns) ? turns : [];
    let moved = new Map();
    Object.keys(value).forEach(key => (value[key] || []).forEach(index => moved.set(index, key)));
    if (!moved.size) return blocks;

    return blocks.map(block => {
        let items = block.items.filter(item => item.index < 0 || !moved.has(item.index) || moved.get(item.index) === block.key);
        let own = new Set(items.map(item => item.index));
        (value[block.key] || []).forEach(index => {
            if (!own.has(index) && feed[index]) items.push({turn: feed[index], index, followUp: false, linked: true});
        });
        items.sort((a, b) => (a.index < 0 || b.index < 0) ? 0 : a.index - b.index);
        return {...block, items};
    }).filter(block => block.items.length);
}

function hasClientAnswer(block) {
    return block.items.some(item => item.turn && item.turn.role === 'client');
}

function lastClientIndex(block) {
    let answers = block.items.filter(item => item.index > -1 && item.turn && item.turn.role === 'client');
    return answers.length ? answers[answers.length - 1].index : -1;
}

// Балл вопроса у реплики кандидата: у технического - оценка evaluate, у
// нетехнического - балл мягкой оценки. Оценивается вопрос целиком, а не каждая
// реплика, поэтому балл встаёт один раз - у последней реплики ответа, которой
// цепочка вопроса закончилась. technical - к какой линзе балл относится.
export function answerScores(blocks) {
    let map = new Map();
    (blocks || []).forEach(block => {
        let rated = block.technical === true ? block.evaluation
            : block.technical === false ? block.soft : null;
        if (!rated || rated.state !== 'done') return;
        let index = lastClientIndex(block);
        index > -1 && map.set(index, {score: rated.score, max: rated.max, technical: block.technical});
    });
    return map;
}

// Флаги поведения - из мягкой оценки нетехнических вопросов: ответ мимо
// вопроса или уклончивый. Флаг ставится у последней реплики ответа.
export const BEHAVIOR_FLAG_LABELS = {evasive: 'Уклончиво', off_topic: 'Не по вопросу'};

export function behaviorFlags(blocks) {
    let flags = new Map();
    (blocks || []).forEach(block => {
        let soft = block.soft;
        if (!soft || soft.state !== 'done' || !BEHAVIOR_FLAG_LABELS[soft.relevance]) return;
        let index = lastClientIndex(block);
        index > -1 && flags.set(index, soft.relevance);
    });
    return flags;
}

// Счётчики панели линз: вопросы, оставшиеся без реплики кандидата, и ответы
// мимо вопроса или уклончивые. Мягкая оценка вопроса без реплики кандидата
// сюда не попадает: она судила бы слова интервьюера (см. readQaBlocks).
export function behaviorCounts(blocks) {
    let list = blocks || [];
    let counts = {unanswered: list.filter(block => !hasClientAnswer(block)).length, evasive: 0, off_topic: 0};
    list.forEach(block => {
        let soft = block.soft;
        if (soft && soft.state === 'done' && BEHAVIOR_FLAG_LABELS[soft.relevance]) counts[soft.relevance] += 1;
    });
    return counts;
}

// Нетехническая оценка: баллов у мягкой оценки нет, поэтому итог - сколько
// нетехнических ответов из оценённых дано по теме и развёрнуто (зелёная полоса).
export function behaviorScore(blocks) {
    let done = (blocks || []).filter(block => block.soft && block.soft.state === 'done');
    if (!done.length) return null;
    return {good: done.filter(block => block.soft.band === 'good').length, count: done.length};
}

// Серия пропусков: два и больше вопросов подряд без ответа кандидата. Отметка
// встаёт у первого вопроса серии - возвращаются ключи таких вопросов.
export function skipSeriesStarts(blocks) {
    let starts = new Set();
    let list = blocks || [];
    list.forEach((block, position) => {
        let skipped = item => item && !hasClientAnswer(item);
        if (skipped(block) && skipped(list[position + 1]) && !skipped(list[position - 1])) starts.add(block.key);
    });
    return starts;
}

// «Ход разговора» как в карточке звонка: по дорожке на роль, реплика - отрезок
// своей длины. Цвет - не эмоция, а связь с оценкой: ответ с низким баллом или
// мимо вопроса - critical, средний балл, уклончивость или замечания - warning.
const TRACK_LABELS = {manager: 'Интервьюер', client: 'Кандидат', unknown: 'Роль не определена'};

function roleOf(role) {
    let value = String(role || '').toLowerCase();
    if (['manager', 'our', 'near_end', 'interviewer'].includes(value)) return 'manager';
    if (['client', 'external', 'far_end', 'candidate'].includes(value)) return 'client';
    return 'unknown';
}

function band(score, max) {
    let ratio = score / (max || 10);
    return ratio >= 0.7 ? 'good' : ratio >= 0.4 ? 'fair' : 'poor';
}

export function turnTone(index, turn, scores, flags) {
    let rated = scores && scores.get(index);
    let flag = flags && flags.get(index);
    let level = rated && typeof rated.score === 'number' ? band(rated.score, rated.max) : null;
    if (level === 'poor' || flag === 'off_topic') return 'critical';
    let marked = turn && Array.isArray(turn.markerIds) && turn.markerIds.length > 0;
    if (level === 'fair' || flag === 'evasive' || marked) return 'warning';
    return 'speech';
}

export function conversationTracks(turns, durationMs, scores, flags) {
    if (!durationMs) return [];
    let byRole = {manager: [], client: [], unknown: []};
    (turns || []).forEach((turn, index) => {
        if (!turn) return;
        let startMs = Math.max(0, Number(turn.startMs) || 0);
        let endMs = Math.max(startMs, Number(turn.endMs) || startMs);
        let left = percent(startMs, durationMs);
        byRole[roleOf(turn.role)].push({
            index,
            startMs,
            endMs,
            left,
            width: percent(endMs, durationMs) - left,
            tone: turnTone(index, turn, scores, flags),
            text: String(turn.text || ''),
        });
    });
    return ['manager', 'client', 'unknown']
        .filter(role => byRole[role].length)
        .map(role => ({role, label: TRACK_LABELS[role], segments: byRole[role]}));
}
