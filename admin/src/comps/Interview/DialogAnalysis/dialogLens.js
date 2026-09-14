// Линзы расшифровки (вариант B из docs/design/dialog-evaluation-concepts.html):
// одна лента, поверх неё - акцент на технике или на поведении, шкала времени
// интервью и связывание вопроса без ответа с репликой кандидата. Здесь только
// то, что считается из настоящих данных разбора и оценки ответов; значения,
// под которые функционала ещё нет, живут в dialogLensDemo.js.

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

// Технический вопрос, в котором нет ни одной реплики кандидата: ответ либо
// пропущен, либо разбор отнёс его к другому вопросу - тогда его связывают руками.
export function withoutAnswer(block) {
    return Boolean(block) && block.technical === true
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

// Какой вопрос у реплики ленты: по нему реплика в «Все реплики» знает, что
// она ответ на технический вопрос.
export function blockByTurnIndex(blocks) {
    let map = new Map();
    (blocks || []).forEach(block => block.items.forEach(item => item.index > -1 && map.set(item.index, block)));
    return map;
}
