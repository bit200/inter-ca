// Курс не найден / недоступен: вместо alert показываем обычное уведомление и уводим на список курсов.
// Возвращает true, если ответ был ошибкой и обработан.
export function handleCourseLoadError(r, {notify, go, translate = x => x, fallbackKey = 'courseNotFound'}) {
    if (!r || !r.error) return false;
    notify.error(translate(r.msg || fallbackKey));
    go('/courses');
    return true;
}
