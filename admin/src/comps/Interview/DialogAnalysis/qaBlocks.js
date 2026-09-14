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

// turns - реплики разбора с уже применёнными ролями, active - идёт ли оценка:
// от этого зависит, «оцениваем» ли блок без оценки или он остался без неё.
export function readQaBlocks(result, turns, options) {
    let list = readQaBlockList(result);
    let feed = Array.isArray(turns) ? turns : [];
    let {active = false} = options || {};

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
        };
    }).filter(block => block.items.length);
}
