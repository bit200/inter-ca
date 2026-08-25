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
    const scores = entries
        .map(entry => entry?.evaluate?.score)
        .filter(score => typeof score === 'number');
    const total = attempt?.turns?.length || entries.length;
    const score = scores.length
        ? Math.round((scores.reduce((sum, value) => sum + value, 0) / scores.length) * 10) / 10
        : null;
    return { score, scored: scores.length, total };
}
