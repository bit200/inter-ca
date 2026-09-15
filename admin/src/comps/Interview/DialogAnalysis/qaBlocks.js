// Q&A-блоки оценки ответов: корневой вопрос интервьюера, ответ кандидата и
// уточнения, если были. Бэкенд группирует реплики разбора в блоки, помечает
// технические и отдаёт их в evaluate. Схема ответа ещё устаканивается, поэтому
// читаем терпимо: блок ссылается на реплики разбора индексами или id, а если
// ссылок нет - несёт текст сам (question/answer или dialog, как у мок-интервью).

function asObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function firstArray(...values) {
    return values.find(Array.isArray) || null;
}

function firstNumber(...values) {
    let found = values.find(value => typeof value === 'number' && isFinite(value));
    return found === undefined ? null : found;
}

function firstText(...values) {
    let found = values.find(value => typeof value === 'string' && value.trim());
    return found ? found.trim() : '';
}

export function readQaBlockList(result) {
    if (Array.isArray(result)) return result;
    let value = asObject(result) || {};
    return firstArray(value.blocks, value.qaBlocks, value.items) || [];
}

function readTechnical(block) {
    if (typeof block.technical === 'boolean') return block.technical;
    if (typeof block.isTechnical === 'boolean') return block.isTechnical;
    let classification = asObject(block.classification);
    if (classification && typeof classification.technical === 'boolean') return classification.technical;
    let kind = String(block.kind || block.category || block.classification || '').toLowerCase();
    if (kind === 'technical') return true;
    if (kind === 'non-technical' || kind === 'nontechnical' || kind === 'other') return false;
    return null;
}

// Реплики блока: по ссылкам на ленту разбора, иначе - из текста самого блока.
function readTurns(block, turns) {
    let refs = firstArray(block.turnIndexes, block.turnIndices, block.turnIdx, block.indexes, block.turnIds, block.turns);
    if (refs && refs.length) {
        let resolved = refs.map(ref => {
            if (typeof ref === 'number') {
                return turns[ref] ? {turn: turns[ref], index: ref} : null;
            }
            if (typeof ref === 'string') {
                let index = turns.findIndex(turn => turn && turn.id === ref);
                return index > -1 ? {turn: turns[index], index} : null;
            }
            return asObject(ref) ? {turn: ref, index: -1} : null;
        }).filter(Boolean);
        if (resolved.length) return resolved;
    }

    let dialog = Array.isArray(block.dialog) ? block.dialog : null;
    if (dialog && dialog.length) {
        // В форме мок-интервью реплики идут вопрос-ответ по очереди, роль может не прийти.
        return dialog.map((entry, position) => {
            let item = asObject(entry) || {text: String(entry || '')};
            let role = item.role || (position % 2 === 0 ? 'manager' : 'client');
            return {turn: {...item, role, followUp: item.isMain === false}, index: -1};
        });
    }

    let question = firstText(block.question, block.questionText);
    let answer = firstText(block.answer, block.answerText);
    return [
        question && {turn: {role: 'manager', text: question}, index: -1},
        answer && {turn: {role: 'client', text: answer}, index: -1},
    ].filter(Boolean);
}

function readEvaluation(block, technical, active) {
    let source = asObject(block.evaluation) || asObject(block.evaluate) || asObject(block.evaluateResult) || {};
    let inner = asObject(source.result) || {};
    let error = asObject(source.error) || asObject(block.error) || {};
    let score = firstNumber(source.score, inner.score, block.score);
    let max = firstNumber(source.maxScore, inner.maxScore) || 10;
    let feedback = firstText(source.feedback, source.summary, source.comment, source.explanation,
        inner.feedback, inner.summary, inner.comment, inner.explanation);
    let message = firstText(error.message, source.errorMessage, block.errorMessage);
    let status = String(source.status || '').toLowerCase();

    let state;
    if (technical === false) state = 'skipped';
    else if (score !== null) state = 'done';
    else if (status === 'error' || message) state = 'error';
    else state = active ? 'pending' : 'missing';

    return {state, score, max, feedback, message};
}

// Мягкая оценка нетехнического ответа: по теме ли кандидат ответил, развёрнуто ли
// и задавал ли встречные вопросы. Сервис баллов не ставит - сводим отметки к баллу
// из 10 в той же полосе, что и уровень ответа, чтобы нетехнический блок показывался
// так же, как технический: цифрой, шкалой и скобкой цепочки.
const RELEVANCE_ALIASES = {
    on_topic: 'on_topic', ontopic: 'on_topic', relevant: 'on_topic',
    evasive: 'evasive', partial: 'evasive',
    off_topic: 'off_topic', offtopic: 'off_topic', irrelevant: 'off_topic',
};

// answered - есть ли в блоке реплика кандидата. Без неё модель оценила бы чужие
// слова - группировка иногда кладёт уточнение интервьюера в «ответ», - поэтому
// такую оценку не показываем: блок остаётся «Ответ не найден».
function readSoftEvaluation(block, technical, active, answered) {
    if (technical !== false) return null;
    if (!answered) return {state: 'unanswered'};
    let source = asObject(block.softEvaluate) || asObject(block.softEvaluation);
    if (!source) return {state: active ? 'pending' : 'skipped'};

    let error = asObject(source.error) || {};
    let message = firstText(error.message, source.errorMessage);
    let relevance = RELEVANCE_ALIASES[String(source.relevance || '').toLowerCase().replace(/[\s-]/g, '_')] || null;
    let complete = typeof source.complete === 'boolean' ? source.complete
        : typeof source.completeness === 'string' ? source.completeness.toLowerCase() === 'complete'
        : null;
    let engaged = typeof source.engaged === 'boolean' ? source.engaged
        : typeof source.engagement === 'boolean' ? source.engagement
        : null;
    let note = firstText(source.note, source.comment, source.feedback);

    if (relevance === null && complete === null) {
        return message || String(source.status || '').toLowerCase() === 'error'
            ? {state: 'error', message}
            : {state: active ? 'pending' : 'missing'};
    }

    let band = relevance === 'off_topic' ? 'poor'
        : relevance === 'evasive' || complete === false ? 'fair'
        : 'good';
    return {state: 'done', relevance, complete, engaged, note, band, score: softScore(relevance, complete, engaged, band), max: SOFT_MAX};
}

// Балл мягкой оценки: по теме - 6, уклончиво - 3, мимо - 0; развёрнуто +3 (не
// известно +2), встречные вопросы +1. Итог зажат в полосу уровня ответа, чтобы
// цвет цифры не спорил с отметками: «по теме, но формально» остаётся жёлтым.
const SOFT_MAX = 10;
const RELEVANCE_POINTS = {on_topic: 6, evasive: 3, off_topic: 0};
const BAND_RANGES = {good: [7, 10], fair: [4, 6], poor: [0, 3]};

function softScore(relevance, complete, engaged, band) {
    let raw = (relevance ? RELEVANCE_POINTS[relevance] : 6)
        + (complete === true ? 3 : complete === null ? 2 : 0)
        + (engaged === true ? 1 : 0);
    let [low, high] = BAND_RANGES[band];
    return Math.min(high, Math.max(low, raw));
}

// Полоса оценки: зелёная - уверенный ответ, жёлтая - с пробелами, красная - мимо.
export function scoreBand(score, max) {
    if (typeof score !== 'number') return 'none';
    let ratio = score / (max || 10);
    if (ratio >= 0.7) return 'good';
    if (ratio >= 0.4) return 'fair';
    return 'poor';
}

export function formatScore(score) {
    return Number.isInteger(score) ? String(score) : score.toFixed(1).replace('.', ',');
}

// Пауза перед ответом и его длина: у самого блока или в метриках разговора по тому же месту.
function readTiming(block, metrics) {
    let source = asObject(block.timing) || asObject(block.metrics) || asObject(metrics) || {};
    let delayMs = firstNumber(source.responseDelayMs, block.responseDelayMs);
    let durationMs = firstNumber(source.answerDurationMs, block.answerDurationMs);
    return delayMs === null && durationMs === null ? null : {delayMs, durationMs};
}

// turns - реплики разбора с уже применёнными ролями, active - идёт ли оценка:
// от этого зависит, «оцениваем» ли блок без оценки или он остался без неё;
// timings - тайминги ответов из метрик разговора, по порядку блоков.
export function readQaBlocks(result, turns, options) {
    let list = readQaBlockList(result);
    let feed = Array.isArray(turns) ? turns : [];
    let {active = false, timings = []} = options || {};

    return list.map((raw, position) => {
        let block = asObject(raw) || {};
        let technical = readTechnical(block);
        let items = readTurns(block, feed);
        let managerSeen = false;
        items = items.map(item => {
            let isManager = item.turn.role === 'manager';
            let followUp = item.turn.followUp === true || (isManager && managerSeen);
            if (isManager) managerSeen = true;
            return {...item, followUp};
        });
        let starts = items.map(item => Number(item.turn.startMs)).filter(isFinite);
        let ends = items.map(item => Number(item.turn.endMs)).filter(isFinite);

        return {
            key: block.id || block._id || 'qa' + position,
            number: position + 1,
            technical,
            items,
            startMs: starts.length ? Math.min(...starts) : null,
            endMs: ends.length ? Math.max(...ends) : null,
            evaluation: readEvaluation(block, technical, active),
            soft: readSoftEvaluation(block, technical, active, items.some(item => item.turn.role === 'client')),
            timing: readTiming(block, timings[position]),
        };
    }).filter(block => block.items.length);
}

// Заголовок блока - сам вопрос интервьюера, а не порядковый номер: по номеру
// не понять, о чём речь, пока не прочтёшь реплики. Уточнения в заголовок не идут.
export function questionTitle(block) {
    let items = block && Array.isArray(block.items) ? block.items : [];
    let main = items.find(item => item.turn && item.turn.role === 'manager' && !item.followUp && firstText(item.turn.text));
    return main ? firstText(main.turn.text) : 'Вопрос ' + (block && block.number);
}

// Короткая версия вопроса для шапки: полный текст и так стоит репликой в блоке,
// повторять его в шапке незачем. Берём само вопросительное предложение - интервьюер
// часто начинает с предисловия, - иначе первое содержательное (от 4 слов: «Да, хорошо.»
// о теме не скажет), и обрезаем по границе слова.
export const SHORT_TITLE_LIMIT = 70;

export function shortQuestionTitle(text, limit = SHORT_TITLE_LIMIT) {
    let full = firstText(text).replace(/\s+/g, ' ');
    if (!full) return '';
    let sentences = full.split(/(?<=[.!?…])\s+/).filter(Boolean);
    let words = sentence => sentence.split(' ').length;
    let asked = sentences.filter(sentence => /\?$/.test(sentence) && words(sentence) > 1);
    let short = asked.length ? asked[asked.length - 1]
        : sentences.find(sentence => words(sentence) >= 4) || full;
    if (short.length > limit) {
        let cut = short.slice(0, limit + 1);
        let space = cut.lastIndexOf(' ');
        short = (space > limit / 2 ? cut.slice(0, space) : short.slice(0, limit)).replace(/[\s,;:—–-]+$/, '') + '…';
    }
    return short.charAt(0).toUpperCase() + short.slice(1);
}
