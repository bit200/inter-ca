// Попытка, оставшаяся в статусе "начато", сама по себе никогда не закрывается:
// пользователь ушёл со страницы или закрыл вкладку, а бэкенд статус не меняет
// (см. MockInterviewCore.handleComplete - завершает только сам фронт). Такие
// попытки висели "начато" сутками и не давали увидеть историю как завершённую.
// Договорились считать попытку брошенной, если она начата больше 5 часов назад,
// и закрывать её автоматически - тем же PUT status:'completed', что и обычное
// завершение.
export const STALE_STARTED_MS = 5 * 60 * 60 * 1000;

// Время начала попытки: отдельного поля старта у документа нет, поэтому берём
// последнее обновление (ud), а если его нет - дату создания (cd).
export function attemptStartedAt(attempt) {
    const raw = attempt && (attempt.startedAt || attempt.ud || attempt.cd);
    if (!raw) return null;
    const time = new Date(raw).getTime();
    return Number.isNaN(time) ? null : time;
}

// Висит ли попытка в статусе "начато" дольше допустимых 5 часов.
export function isStaleStarted(attempt, now = Date.now()) {
    if (!attempt || attempt.status !== 'started') return false;
    const startedAt = attemptStartedAt(attempt);
    if (startedAt == null) return false;
    return now - startedAt >= STALE_STARTED_MS;
}

const STATUS_LABEL = {
    draft: 'Ожидает',
    active: 'Ожидает',
    started: 'Начато',
    completed: 'Завершено',
    evaluated: 'Завершено',
};

// Подпись статуса на экране. Брошенную попытку называем завершённой по
// таймауту - человеку важно, что интервью закрыли за него, а не он сам.
export function attemptStatusLabel(attempt, now = Date.now()) {
    if (isStaleStarted(attempt, now)) return 'Завершено по таймауту';
    return STATUS_LABEL[attempt?.status] || attempt?.status;
}
