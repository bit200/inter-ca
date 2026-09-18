// Что положить в объект формы, когда в селекторе выбрали день.
//
// Селектор отдаёт только сутки (YYYY-MM-DD), а в полях админки лежат и голые
// даты («дата транзакции»), и моменты времени («дата звонка» — там есть часы и
// минуты). Если писать в оба одинаково, у звонка при правке даты пропадёт время
// и запись переедет на полночь. Поэтому: у поля со временем меняем только день,
// у поля без времени оставляем короткую строку YYYY-MM-DD.
//
// Экспорт — ESM: модуль импортируют через import {mergeDayIntoValue}, и сборка
// прод-бандла на CommonJS-экспорте такой импорт не находит.

export function mergeDayIntoValue(prev, day) {
    if (!day) return null;
    const parts = String(day).split('-').map(Number);
    const [y, m, d] = parts;
    if (parts.length !== 3 || !y || !m || !d) return null;

    // Голая дата строкой — это сутки без времени, даже если Date разберёт её
    // как полночь UTC и в местном поясе покажет три часа ночи.
    const dayOnly = typeof prev === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(prev.trim());
    const before = !dayOnly && prev ? new Date(prev) : null;
    const hasTime = before && !isNaN(before.getTime())
        && (before.getHours() || before.getMinutes() || before.getSeconds());
    if (!hasTime) return day;

    return new Date(y, m - 1, d,
        before.getHours(), before.getMinutes(), before.getSeconds()).toISOString();
}
