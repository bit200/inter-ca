// Завершённость попытки мок-интервью.
//
// Статус на попытке проставляет фронт: 'started' - когда открылся iframe
// (startInterviewAttempt), 'completed' - когда itk-live прислал
// session_closed и MockInterviewCore.handleComplete успел отправить PUT.
// Если вкладку закрыли или перезагрузили раньше этого PUT (или бот не прислал
// финальное сообщение), попытка так и остаётся "Начато" навсегда - хотя
// собеседование прошло: диалог разобран на ходы (turns) и оценка по нему
// посчитана. Экран при этом верил статусу и вместо результатов показывал
// карточку старта с кнопкой "Продолжить".
//
// Поэтому завершённость считаем по самим данным попытки, а не только по
// статусу: есть ходы или оценка - собеседование состоялось.

import { isAttemptInterrupted } from './attemptInterrupted';

export const PASSED_STATUSES = ['completed', 'evaluated'];

// Незавершённая попытка - её ещё можно открыть заново кнопкой "Продолжить".
export const UNFINISHED_STATUSES = ['draft', 'active', 'started'];

// Прерванная попытка тоже завершена - но подписывать её "Завершено" значит
// прятать то, ради чего признак и запоминается (см. attemptInterrupted.js).
export const INTERRUPTED_LABEL = 'Прервано';

export const STATUS_LABEL = {
    draft: 'Ожидает',
    active: 'Ожидает',
    started: 'Начато',
    completed: 'Завершено',
    evaluated: 'Завершено',
};

// Следы состоявшегося собеседования: ходы приходят с бэкенда уже разобранной
// транскрипцией законченного диалога, оценка (сводная или джобами) вообще
// запускается только после завершения интервью.
function hasInterviewRecord(attempt) {
    return !!(attempt.turns?.length
        || attempt.evaluate?.length
        || attempt.evaluateState?.jobs?.length);
}

export function isAttemptFinished(attempt) {
    if (!attempt) return false;
    if (PASSED_STATUSES.includes(attempt.status)) return true;
    return hasInterviewRecord(attempt);
}

// Подпись статуса для списков попыток: у попытки, застрявшей в "Начато" с
// готовым диалогом, на экране должно стоять "Завершено" - иначе рядом с её же
// баллом висит противоречие.
export function attemptStatusLabel(attempt) {
    if (isAttemptFinished(attempt)) {
        return isAttemptInterrupted(attempt) ? INTERRUPTED_LABEL : STATUS_LABEL.completed;
    }
    return STATUS_LABEL[attempt?.status] || attempt?.status;
}
