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
        // Группировка бэкенда бывает, кладёт одну реплику в блок дважды (ответ и
        // уточнение пересеклись) - в блоке реплика одна, иначе фразы дублируются
        // и подача считает паразиты дважды.
        let seen = new Set();
        resolved = resolved.filter(item => {
            if (item.index < 0) return true;
            if (seen.has(item.index)) return false;
            seen.add(item.index);
            return true;
        });
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

    // Сырой результат сервиса оценки - по нему попап и страница детализации
    // раскладывают балл на показатели. Результат лежит либо плоско, либо в result.
    let result = state === 'done' ? (typeof source.score === 'number' ? source : inner) : null;

    return {state, score, max, feedback, message, result};
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
// candidateLed - блок открыл сам кандидат («Время работы какое?»): разговор ведёт он,
// и встречные вопросы тут неприменимы, что бы ни ответила модель - её промпт
// рассчитан на вопрос интервьюера.
function readSoftEvaluation(block, technical, active, answered, candidateLed, delivery) {
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
    let engaged = candidateLed ? null
        : typeof source.engaged === 'boolean' ? source.engaged
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
    return {state: 'done', relevance, complete, engaged, note, band, delivery,
        score: softBreakdown({relevance, complete, engaged, band, delivery}).score, max: SOFT_MAX};
}

// Балл мягкой оценки: по теме - 6, уклончиво - 3, мимо - 0; развёрнуто +3 (не
// известно +2), встречные вопросы +1. Встречные нужны не на каждом вопросе: если
// модель сочла их неприменимыми (engaged: null), слагаемого нет вовсе, а его балл
// уходит в полноту (+4, не известно +3) - шкала остаётся из 10 и ответ не теряет
// балл за то, чего от него не ждали. «Без встречных вопросов 0 из 1» - только
// когда повод спросить был (engaged: false). Итог зажат в полосу уровня ответа,
// чтобы цвет цифры не спорил с отметками: «по теме, но формально» остаётся жёлтым.
const SOFT_MAX = 10;
const RELEVANCE_POINTS = {on_topic: 6, evasive: 3, off_topic: 0};
const BAND_RANGES = {good: [7, 10], fair: [4, 6], poor: [0, 3]};

// Из чего сложился балл мягкой оценки: «Содержание» - слагаемые по отметкам и
// поправка, если сумма не влезла в полосу уровня ответа, - и «Подача» - штрафы
// за речь. Итог - 70% содержания плюс 30% содержания, помноженные на долю подачи. Попап над баллом показывает ровно это.
export function softBreakdown({relevance, complete, engaged, band, delivery}) {
    let counted = typeof engaged === 'boolean';
    let completeMax = counted ? 3 : 4;
    let rows = [
        {key: 'relevance', label: relevance ? RELEVANCE_TITLES[relevance] : 'Тема ответа не определена',
            points: relevance ? RELEVANCE_POINTS[relevance] : 6, max: 6},
        {key: 'complete', label: complete === true ? 'Развёрнуто' : complete === false ? 'Формально' : 'Полнота не определена',
            points: complete === true ? completeMax : complete === null ? completeMax - 1 : 0, max: completeMax},
        counted && {key: 'engaged', label: engaged ? 'Встречные вопросы' : 'Без встречных вопросов',
            points: engaged ? 1 : 0, max: 1},
    ].filter(Boolean);
    let raw = rows.reduce((sum, row) => sum + row.points, 0);
    let [low, high] = BAND_RANGES[band];
    let content = Math.min(high, Math.max(low, raw));
    let speech = deliveryBreakdown(delivery);
    // Подача взвешивается от балла содержания, а не от 10: гладкая речь не
    // поднимает ответ мимо вопроса, а только снимает до 30% с того, что заработано.
    let score = speech
        ? Math.round(content * (CONTENT_WEIGHT + DELIVERY_WEIGHT * speech.score / speech.max) * 10) / 10
        : content;
    return {rows, raw, content, delivery: speech, score, max: SOFT_MAX,
        weights: {content: CONTENT_WEIGHT, delivery: DELIVERY_WEIGHT}};
}

// «Подача» из 10: по смыслу ответ может быть безупречен, но паразиты, запинки и
// долгие паузы делают его не на 10. Штрафы детерминированные и считаются по уже
// размеченным данным: паразиты - маркеры разбора, запинки - по тексту реплик,
// паузы - тайминги. Паразиты берём плотностью на 100 слов, а не штуками: четыре
// «ну» в длинном рассказе и в двух фразах - разная речь.
const CONTENT_WEIGHT = 0.7;
const DELIVERY_WEIGHT = 0.3;
const FILLER_STEPS = [[10, 6], [6, 4], [3, 2]];
const DISFLUENCY_MAX = 3;
const LONG_DELAY_MS = 4500;
const VERY_LONG_DELAY_MS = 8000;
const INNER_PAUSE_MS = 3000;
const INNER_PAUSE_MAX = 2;

function plural(count, one, few, many) {
    let mod10 = count % 10;
    let mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
    return many;
}

function seconds(ms) {
    return formatScore(Math.round(ms / 100) / 10) + ' с';
}

export function deliveryBreakdown(delivery) {
    if (!delivery) return null;
    let {words = 0, fillers = 0, disfluencies = 0, delayMs = null, innerPauses = 0} = delivery;
    let rows = [];

    let density = words ? fillers / words * 100 : 0;
    let fillerStep = FILLER_STEPS.find(([limit]) => density >= limit);
    rows.push({key: 'fillers',
        label: fillers
            ? `${fillers} ${plural(fillers, 'паразит', 'паразита', 'паразитов')} на ${words} ${plural(words, 'слово', 'слова', 'слов')}`
            : 'Без слов-паразитов',
        penalty: fillerStep ? fillerStep[1] : 0});

    rows.push({key: 'disfluencies',
        label: disfluencies
            ? `${disfluencies} ${plural(disfluencies, 'речевой сбой', 'речевых сбоя', 'речевых сбоев')}`
            : 'Без речевых сбоев',
        penalty: Math.min(DISFLUENCY_MAX, disfluencies)});

    typeof delayMs === 'number' && rows.push({key: 'delay',
        label: 'Пауза перед ответом ' + seconds(delayMs),
        penalty: delayMs >= VERY_LONG_DELAY_MS ? 2 : delayMs >= LONG_DELAY_MS ? 1 : 0});

    innerPauses > 0 && rows.push({key: 'innerPauses',
        label: `${innerPauses} ${plural(innerPauses, 'долгая пауза', 'долгие паузы', 'долгих пауз')} в ответе`,
        penalty: Math.min(INNER_PAUSE_MAX, innerPauses)});

    let score = Math.max(0, SOFT_MAX - rows.reduce((sum, row) => sum + row.penalty, 0));
    return {rows, score, max: SOFT_MAX};
}

// Речевые сбои в тексте ответа: «эээ»/«ммм», повтор слова подряд («я я»),
// самоперебив многоточием посреди реплики («У меня… Я был») и оборванная
// в конце ответа фраза («офисов этой…»).
const HESITATION = /^(э{2,}|м{2,}|эм+|хм+|а{3,})$/;

export function countDisfluencies(texts) {
    let count = 0;
    let list = texts.map(text => String(text || '').trim()).filter(Boolean);
    list.forEach((text, position) => {
        let words = text.toLowerCase().split(/[^\p{L}\d-]+/u).filter(Boolean);
        words.forEach((word, index) => {
            if (HESITATION.test(word)) count++;
            else if (index > 0 && word === words[index - 1] && !HESITATION.test(word)) count++;
        });
        let breaks = text.match(/(…|\.{3})(?=\s*\S)/g);
        if (breaks) count += breaks.length;
        if (position === list.length - 1 && /(…|\.{3})$/.test(text)) count++;
    });
    return count;
}

function countWords(text) {
    return String(text || '').split(/\s+/).filter(word => /[\p{L}\d]/u.test(word)).length;
}

// Сырые данные подачи по репликам кандидата в блоке. markersById - маркеры
// разбора по id: паразит - маркер filler у реплики. Пауза внутри ответа - разрыв
// между соседними репликами кандидата без реплики интервьюера между ними.
function readDelivery(items, markersById, timing) {
    let answers = items.filter(item => item.turn.role === 'client');
    if (!answers.length) return null;
    let words = answers.reduce((sum, item) => sum + countWords(item.turn.text), 0);
    let fillers = answers.reduce((sum, item) => sum + (Array.isArray(item.turn.markerIds) ? item.turn.markerIds : [])
        .filter(id => {
            let marker = markersById.get(id);
            return marker && marker.category === 'filler';
        }).length, 0);
    let innerPauses = 0;
    items.forEach((item, index) => {
        let prev = items[index - 1];
        if (!prev || item.turn.role !== 'client' || prev.turn.role !== 'client') return;
        let gap = Number(item.turn.startMs) - Number(prev.turn.endMs);
        if (isFinite(gap) && gap >= INNER_PAUSE_MS) innerPauses++;
    });
    return {
        words,
        fillers,
        disfluencies: countDisfluencies(answers.map(item => item.turn.text)),
        delayMs: timing ? timing.delayMs : null,
        innerPauses,
    };
}

const RELEVANCE_TITLES = {on_topic: 'По теме', evasive: 'Уклончиво', off_topic: 'Не по вопросу'};

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
    let {active = false, timings = [], markers = []} = options || {};
    let markersById = new Map();
    (Array.isArray(markers) ? markers : []).forEach(marker => marker && marker.id !== undefined && markersById.set(marker.id, marker));

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
        let timing = readTiming(block, timings[position]);

        return {
            key: block.id || block._id || 'qa' + position,
            number: position + 1,
            technical,
            items,
            startMs: starts.length ? Math.min(...starts) : null,
            endMs: ends.length ? Math.max(...ends) : null,
            evaluation: readEvaluation(block, technical, active),
            // Сохранённая расшифровка оценки (кнопка «Расшифровать оценку»).
            explain: asObject(block.explain),
            soft: readSoftEvaluation(block, technical, active, items.some(item => item.turn.role === 'client'),
                items.length > 0 && items[0].turn.role === 'client', readDelivery(items, markersById, timing)),
            timing,
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
