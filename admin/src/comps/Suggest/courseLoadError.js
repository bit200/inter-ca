// Курс не найден / недоступен: вместо alert показываем обычное уведомление и уводим на список курсов.
// Возвращает true, если ответ был ошибкой и обработан.
export function handleCourseLoadError(r, {notify, go, fallbackMessage = 'Курс не найден'}) {
    if (!r || !r.error) return false;
    notify.error(r.msg || fallbackMessage);
    go('/courses');
    return true;
}
