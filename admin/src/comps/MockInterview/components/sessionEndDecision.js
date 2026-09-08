// Как трактовать закрытие сессии, которое приходит из iframe itk-live.
//
// Раньше завершением попытки считался ровно один статус - 'completed'. Но
// itk-live закрывает сессию не одним статусом: попытка 1005 пришла с
// session.status = 'closed' (13 ходов, интервью реально пройдено), ушла в
// ветку "просто закрыть оверлей" и навсегда осталась в "Начато".
//
// Полного списка терминальных статусов у нас нет и он может пополняться на их
// стороне, поэтому перечисляем то, что короче и надёжнее - статусы живой
// сессии. Всё остальное (closed, completed, finished, ended, ...) - это конец
// интервью, а значит завершение попытки.
const ACTIVE_SESSION_STATUSES = [
    'active',
    'in_progress',
    'in-progress',
    'inprogress',
    'running',
    'started',
    'starting',
    'open',
    'live',
    'ready',
    'paused',
];

// Конец, но не прохождение: сессию бросили или она сломалась. Такую попытку
// завершённой не помечаем - иначе экран покажет результаты пустого интервью.
const CANCELLED_SESSION_STATUSES = [
    'cancelled',
    'canceled',
    'aborted',
    'abandoned',
    'expired',
    'declined',
    'rejected',
    'failed',
    'error',
    'timeout',
];

const norm = (status) => String(status ?? '').trim().toLowerCase();

// Сессия ещё живёт: закрывать/завершать попытку нечего.
export function isActiveSessionStatus(status) {
    return ACTIVE_SESSION_STATUSES.includes(norm(status));
}

export function isCancelledSessionStatus(status) {
    return CANCELLED_SESSION_STATUSES.includes(norm(status));
}

// Терминальный статус, означающий пройденное интервью: не активный и не
// отменённый. Пустой статус тоже считаем прохождением - session_closed сам по
// себе говорит, что сессии больше нет, а гадать в пользу "Начато" мы уже
// пробовали.
export function isFinishedSessionStatus(status) {
    return !isActiveSessionStatus(status) && !isCancelledSessionStatus(status);
}

// Признаки того, что кандидат уже успел наотвечать. Точного поля в контракте
// postMessage нет, поэтому смотрим на всё, чем itk-live может отдать прогресс
// в itk.interview.state, и берём максимум за сессию.
const PROGRESS_FIELDS = [
    'turns',
    'turnsCount',
    'answers',
    'answersCount',
    'answeredCount',
    'answeredQuestions',
    'questionIndex',
    'questionNumber',
    'messagesCount',
];

export function sessionProgressOf(payload) {
    if (!payload) return 0;
    let progress = 0;
    for (const field of PROGRESS_FIELDS) {
        const value = payload[field];
        const count = Array.isArray(value) ? value.length : (typeof value === 'number' ? value : 0);
        if (Number.isFinite(count) && count > progress) {
            progress = count;
        }
    }
    return progress;
}
