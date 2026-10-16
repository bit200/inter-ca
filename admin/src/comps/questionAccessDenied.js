// Бэкенд отвечает 403 {error: 'question is not in your courses'}, если задачи нет в курсах пользователя.
export const QUESTION_DENIED_ERROR = 'question is not in your courses';

export function isQuestionDenied(e) {
    return !!e && e.error === QUESTION_DENIED_ERROR;
}

// Показывает уведомление и уводит на список курсов. Возвращает true, если отказ обработан.
export function handleQuestionDenied(e, {notify, go, message}) {
    if (!isQuestionDenied(e)) return false;
    notify.error(message);
    go('/courses');
    return true;
}
