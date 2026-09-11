// Состояние разбора диалога: очередь на стороне api гоняет запись по шагам
// queued -> downloading -> analyzing -> done/error, а таб показывает, где она
// сейчас, и решает судьбу кнопки «Оценить». Логика вынесена из вёрстки:
// по ней же считается, можно ли жать кнопку, и её проверяют тесты.

// Шаги идут в том порядке, в каком их проходит очередь; error шагом не является -
// это исход, поэтому в дорожке его нет.
export const PIPELINE_STEPS = ['queued', 'downloading', 'analyzing', 'done'];

// Активная обработка - всё, что ещё не пришло к исходу: пока очередь работает,
// повторно давить «Оценить» нельзя, иначе в mesh уедет вторая задача на те же часы.
const ACTIVE = ['queued', 'downloading', 'analyzing'];

const KNOWN = [...ACTIVE, 'done', 'error'];

export function isActiveStatus(status) {
    return ACTIVE.indexOf(status) > -1;
}

export function isTerminalStatus(status) {
    return status === 'done' || status === 'error';
}

// Разбор приходит внутри интервью и за время жизни очереди успел побывать
// в нескольких формах, поэтому статус и текст ошибки читаем терпимо:
// пустой объект - это «ещё не запускали», а не ошибка.
export function normalizeAnalysis(source) {
    let value = source && typeof source === 'object' ? source : {};
    let status = String(value.status || '').toLowerCase();
    if (KNOWN.indexOf(status) < 0) {
        status = '';
    }
    let error = value.error && typeof value.error === 'object' ? value.error : {};
    // message читаем в том числе у уже нормализованного объекта: разбор приходит
    // и сырым от api, и повторно из состояния таба.
    let message = value.errorMessage || error.message || value.reason || value.message || '';
    // Ретраебл-ошибку очередь дожмёт сама, поэтому ручная кнопка при ней не нужна.
    // Флага может не быть - тогда ошибка считается терминальной и человек решает сам.
    let retryable = value.retryable === true || error.retryable === true;

    return {
        status,
        message: String(message || ''),
        retryable,
        attempts: +value.attempts || 0,
        step: String(value.step || value.stage || '') || status,
        progress: typeof value.progress === 'number' ? value.progress : null,
        startedAt: value.startedAt || null,
        finishedAt: value.finishedAt || null,
        updatedAt: value.updatedAt || null,
        result: value.result && typeof value.result === 'object' ? value.result : null,
    };
}

// Кнопка «Оценить»: единственное место, где решается, видна она, жмётся ли и что
// на ней написано. Правила задачи: при готовом разборе кнопки нет; пока очередь
// работает - она есть, но заблокирована со спиннером; терминальная
// неретраебл-ошибка возвращает кнопку вместе с причиной.
export function evaluateButtonState(analysis, options) {
    let state = normalizeAnalysis(analysis);
    let {hasVideo = true, sending = false} = options || {};

    if (state.status === 'done') {
        return {visible: false, disabled: true, busy: false, reason: ''};
    }

    let busy = sending || isActiveStatus(state.status);
    // Ретраебл-ошибку очередь перезапустит сама - для человека это та же работа.
    let waiting = busy || (state.status === 'error' && state.retryable);

    return {
        visible: true,
        disabled: waiting || !hasVideo,
        busy: waiting,
        // Причину показываем только когда дальше без человека дело не пойдёт.
        reason: state.status === 'error' && !state.retryable ? state.message : '',
        label: state.status === 'error' && !state.retryable ? 'evaluateAgain' : 'evaluate',
    };
}

// Индекс текущего шага в дорожке: по нему подсвечиваются пройденные этапы.
export function stepIndex(status) {
    let index = PIPELINE_STEPS.indexOf(status);
    return index < 0 ? -1 : index;
}

export function stepState(step, status) {
    if (status === 'error') {
        // Ошибка обрывает дорожку на шаге, где очередь споткнулась; предыдущие
        // шаги при этом остаются пройденными.
        return 'idle';
    }
    let current = stepIndex(status);
    let own = stepIndex(step);
    if (current < 0 || own < 0) return 'idle';
    if (own < current) return 'done';
    if (own === current) return status === 'done' ? 'done' : 'active';
    return 'idle';
}
