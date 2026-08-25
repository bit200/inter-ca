// Оценка мок-интервью считается пачкой джобов - по одному на вопрос
// (interview.evaluateState.jobs). Пачка может завершиться частично:
// evaluateState.status === 'errored' означает "хотя бы один вопрос не оценён",
// а не "оценки нет вообще" - в том же ответе рядом лежат нормально
// посчитанные interview.evaluate по остальным вопросам.
// Поэтому статус считаем всегда по конкретному вопросу, а не по общему
// evaluateState.status: есть оценка - показываем оценку, нет - показываем,
// что именно этот вопрос оценить не вышло.

const ERROR_STATUSES = ['errored', 'error', 'failed'];
const PROCESSING_STATUSES = ['processing', 'running', 'started', 'in_progress'];

// Оценка считается готовой, когда у вопроса есть посчитанный score - именно на
// него смотрит MockInterviewEvaluationBlock. Пустой объект оценки (джоба
// завелась, но результата не принесла) готовой не считается.
export function hasEvaluateResult(evaluate) {
    return !!evaluate && evaluate.score != null;
}

// -> 'done' | 'processing' | 'pending' | 'error'
export function getQuestionEvaluateStatus(evaluate, job) {
    if (hasEvaluateResult(evaluate)) return 'done';
    const status = job?.status;
    if (ERROR_STATUSES.includes(status)) return 'error';
    if (PROCESSING_STATUSES.includes(status)) return 'processing';
    return 'pending';
}

// Индекс джоб по questionId; на всякий случай переживает отсутствие
// evaluateState (старые попытки, оценённые до появления джоб).
export function jobsByQuestion(evaluateState) {
    const map = {};
    (evaluateState?.jobs || []).forEach(job => {
        if (job && job.questionId) map[job.questionId] = job;
    });
    return map;
}

// Сколько вопросов остались без оценки из-за ошибки - для сводки над списком
// вопросов.
export function countFailedQuestions(turns) {
    return turns.filter(turn => turn.evaluateStatus === 'error').length;
}

// Сводка по попытке для истории: средний балл считается только по оценённым
// вопросам, поэтому рядом нужно показать, сколько их было на самом деле -
// иначе "Балл: 8/10" по 7 вопросам из 10 читается как оценка всей попытки.
export function attemptScoreSummary(attempt) {
    const entries = attempt?.evaluate || [];
    const jobs = jobsByQuestion(attempt?.evaluateState);
    const scored = {};
    entries.forEach((entry, ind) => {
        const evaluate = resolveQuestionEvaluate(entry?.evaluate, jobs[entry?.questionId]);
        if (hasEvaluateResult(evaluate)) scored[entry?.questionId || 'entry-' + ind] = evaluate.score;
    });
    // Джоба могла досчитаться, не попав в сводный interview.evaluate - её
    // результат тоже идёт в средний балл (см. resolveQuestionEvaluate).
    Object.keys(jobs).forEach(questionId => {
        if (scored[questionId] == null && hasEvaluateResult(jobs[questionId].result)) {
            scored[questionId] = jobs[questionId].result.score;
        }
    });
    const scores = Object.values(scored);
    const total = attempt?.turns?.length || Math.max(entries.length, Object.keys(jobs).length);
    const score = scores.length
        ? Math.round((scores.reduce((sum, value) => sum + value, 0) / scores.length) * 10) / 10
        : null;
    return { score, scored: scores.length, total };
}

// Оценка одного вопроса живёт в двух местах: сводный interview.evaluate и
// результат самой джобы (evaluateState.jobs[].result). Когда пачка упала
// целиком, сводный список может не пополниться, хотя джоба честно досчиталась
// и принесла result со score - тогда показывать надо именно его, а не
// "Ожидает оценки".
export function resolveQuestionEvaluate(evaluate, job) {
    if (hasEvaluateResult(evaluate)) return evaluate;
    if (hasEvaluateResult(job?.result)) return job.result;
    return evaluate;
}

// Часть ошибок оценки нет смысла перезапускать как есть: аудиозапись ответа не
// доехала до хранилища (job.unrecoverable), и повторный прогон с аудио упадёт
// так же. Текст ответа при этом сохранён - такой вопрос можно оценить по
// одному тексту, без аудио-метрик.
export function isAudioLostJob(job) {
    return !!(job?.unrecoverable || job?.result?.unrecoverable);
}

// Оценка, посчитанная по одному тексту: в ней нет метрик темпа, пауз и
// слов-паразитов, поэтому рядом с баллом нужна пометка - иначе балл читается
// как полноценный.
export function isTextOnlyEvaluate(evaluate) {
    return !!(evaluate && (evaluate.textOnly || evaluate.mode === 'text'));
}
