// Итог интервью поверх оценки ответов: общая сводка с баллом, отметки
// приветствия и прощания и метрики разговора без LLM. Всё лежит в том же
// результате оценки ответов, что и блоки (answersEvaluate.overall / greeting /
// metrics). Схема у бэкенда ещё устаканивается, поэтому читаем терпимо, а
// отсутствующее поле - это «ещё не посчитано», а не ошибка.

function asObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function firstNumber(...values) {
    let found = values.find(value => typeof value === 'number' && isFinite(value));
    return found === undefined ? null : found;
}

function firstText(...values) {
    let found = values.find(value => typeof value === 'string' && value.trim());
    return found ? found.trim() : '';
}

function firstBoolean(...values) {
    let found = values.find(value => typeof value === 'boolean');
    return found === undefined ? null : found;
}

function textList(value) {
    if (typeof value === 'string') return value.trim() ? [value.trim()] : [];
    return Array.isArray(value)
        ? value.map(item => firstText(item, asObject(item) && asObject(item).text)).filter(Boolean)
        : [];
}

// Общая оценка интервью: текст сводки и один балл. Шкалу бэкенд может не прислать -
// тогда судим по самому числу: до 10 - десятибалльная, больше - стобалльная.
export function readOverall(result) {
    let source = asObject(asObject(result) && result.overall);
    if (!source) return null;
    let inner = asObject(source.result) || {};
    let score = firstNumber(source.score, source.overallScore, inner.score);
    let max = firstNumber(source.maxScore, source.max, source.scale, inner.maxScore)
        || (score !== null && score > 10 ? 100 : 10);
    let summary = firstText(source.summary, source.text, source.comment, source.feedback, inner.summary, inner.text);
    let strengths = textList(source.strengths || inner.strengths);
    let weaknesses = textList(source.weaknesses || inner.weaknesses);
    let message = firstText(asObject(source.error) && source.error.message, source.errorMessage);
    if (score === null && !summary && !strengths.length && !weaknesses.length && !message) return null;
    return {score, max, summary, strengths, weaknesses, message};
}

// Итог интервью сводит обе части: балл сервиса - техническая оценка, среднее мягких
// оценок нетехнических ответов - нетехническая. Нетехническая идёт с весом SOFT_WEIGHT,
// чтобы итог говорил об интервью целиком, а не только о технических ответах.
// Технических вопросов нет - балл сервиса выходит нулём, итог только по нетехнической
// части (basis 'soft'). Нечего усреднять - балл сервиса как есть.
// Итога ещё нет (пишется) - не подставляем: блок итога показывает ожидание.
export const SOFT_WEIGHT = 0.6;

export function combineOverall(overall, blocks) {
    if (!overall) return overall;
    let list = Array.isArray(blocks) ? blocks : [];
    let rated = list.map(block => block && block.soft)
        .filter(soft => soft && soft.state === 'done' && typeof soft.score === 'number');
    if (!rated.length) return overall;
    let max = overall.max || 10;
    let round = value => Math.round(value * 10) / 10;
    let soft = round(rated.reduce((sum, item) => sum + item.score / (item.max || 10) * max, 0) / rated.length);
    let hasTechnical = list.some(block => block && block.technical === true);
    if (!hasTechnical || overall.score === null) return {...overall, score: soft, max, basis: 'soft'};
    let technical = overall.score;
    let score = round((technical + soft * SOFT_WEIGHT) / (1 + SOFT_WEIGHT));
    return {...overall, score, max, basis: 'combined', parts: {technical, soft, softWeight: SOFT_WEIGHT}};
}

// Приветствие и прощание - отдельный чек по началу и концу разговора, не блок:
// группировка эти реплики пропускает. null у отметки - чек о ней ничего не сказал.
export function readGreeting(result) {
    let value = asObject(result) || {};
    let source = asObject(value.greeting) || {};
    let farewell = asObject(value.farewell) || {};
    let greeted = firstBoolean(source.greeted, source.greeting, source.hello, source.present);
    let farewelled = firstBoolean(source.farewelled, source.farewell, source.saidGoodbye, source.goodbye,
        farewell.farewelled, farewell.present);
    let note = firstText(source.note, source.comment, farewell.note);
    if (greeted === null && farewelled === null) return null;
    return {greeted, farewelled, note};
}

function readStats(value) {
    let source = asObject(value);
    if (!source) return typeof value === 'number' && isFinite(value) ? {median: value, mean: value, count: null} : null;
    let median = firstNumber(source.median, source.p50);
    let mean = firstNumber(source.mean, source.avg, source.average);
    if (median === null && mean === null) return null;
    return {median, mean, count: firstNumber(source.count)};
}

// Метрики разговора: баланс речи, перебивания по тому, кто перебил, тайминги ответов.
export function readDialogMetrics(result) {
    let value = asObject(result) || {};
    let source = asObject(value.metrics) || asObject(value.dialogMetrics);
    if (!source) return null;

    let speechSource = asObject(source.speech) || asObject(source.speechBalance) || {};
    let managerMs = firstNumber(speechSource.managerMs, speechSource.interviewerMs);
    let clientMs = firstNumber(speechSource.clientMs, speechSource.candidateMs);
    let managerPercent = firstNumber(speechSource.managerPercent, speechSource.interviewerPercent);
    let clientPercent = firstNumber(speechSource.clientPercent, speechSource.candidatePercent);
    let total = (managerMs || 0) + (clientMs || 0);
    if (managerPercent === null && clientPercent === null && total > 0) {
        managerPercent = managerMs * 100 / total;
        clientPercent = clientMs * 100 / total;
    }
    if (managerPercent === null && clientPercent !== null) managerPercent = 100 - clientPercent;
    if (clientPercent === null && managerPercent !== null) clientPercent = 100 - managerPercent;
    let speech = managerPercent === null ? null : {managerPercent, clientPercent, managerMs, clientMs};

    let interruptSource = asObject(source.interruptions) || {};
    let byManager = firstNumber(interruptSource.managerInterruptedClient, interruptSource.byManager, interruptSource.manager);
    let byClient = firstNumber(interruptSource.clientInterruptedManager, interruptSource.byClient, interruptSource.client);
    let interruptions = byManager === null && byClient === null
        ? null
        : {byManager: byManager || 0, byClient: byClient || 0, total: firstNumber(interruptSource.total) || (byManager || 0) + (byClient || 0)};

    let responses = asObject(source.responses) || asObject(source.timings) || {};
    let delay = readStats(responses.responseDelayMs || responses.delayMs);
    let duration = readStats(responses.answerDurationMs || responses.durationMs);

    if (!speech && !interruptions && !delay && !duration) return null;
    return {speech, interruptions, delay, duration};
}

// Тайминги по блокам идут в том же порядке, что и блоки оценки.
export function readBlockTimings(result) {
    let source = asObject(asObject(result) && (result.metrics || result.dialogMetrics));
    return source && Array.isArray(source.blocks) ? source.blocks : [];
}

// Секунды с одним знаком: паузы перед ответом бывают доли секунды, длинные ответы - минуты.
export function formatMs(ms) {
    if (typeof ms !== 'number' || !isFinite(ms)) return '—';
    let sign = ms < 0 ? '−' : '';
    let seconds = Math.abs(ms) / 1000;
    if (seconds >= 60) {
        let whole = Math.round(seconds);
        return sign + Math.floor(whole / 60) + ' мин ' + String(whole % 60).padStart(2, '0') + ' с';
    }
    let text = seconds < 10 ? seconds.toFixed(1).replace('.', ',').replace(',0', '') : String(Math.round(seconds));
    return sign + text + ' с';
}
