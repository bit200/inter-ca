// Календарная сетка селектора дня: дата строкой YYYY-MM-DD, названия дней и
// месяцев, шесть недель месяца. Перенесено из админки aquagor (FnsBank/fnsBankModel),
// где этот же селектор стоит в Smart-формах.

// Дата в формате <input type="date"> — YYYY-MM-DD по местному времени.
// Через toISOString нельзя: в московском поясе он сдвигает дату на сутки назад.
export function toDateValue(date) {
    if (!date) return null;
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return null;
    const p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}


export const WEEKDAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];

const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
    'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];

// Заголовок месяца в календаре: «август 2026».
export function monthTitle(year, month) {
    return MONTHS[((month % 12) + 12) % 12] + ' ' + year;
}

// Сетка месяца для календаря: шесть недель по семь дней, начиная с понедельника.
// Дни соседних месяцев не выбрасываем, а помечаем out — так в сетке нет дыр,
// и конец диапазона можно дотянуть до соседнего месяца, не листая.
// Высота всегда 6 недель: иначе попап прыгает при листании.
export function monthGrid(year, month) {
    const first = new Date(year, month, 1);
    const shift = (first.getDay() + 6) % 7; // воскресенье — последний день недели
    const start = new Date(year, month, 1 - shift);
    const weeks = [];
    for (let w = 0; w < 6; w++) {
        const days = [];
        for (let d = 0; d < 7; d++) {
            const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d);
            days.push({
                value: toDateValue(date),
                day: date.getDate(),
                out: date.getMonth() !== ((month % 12) + 12) % 12,
            });
        }
        weeks.push(days);
    }
    return weeks;
}

// Клик по числу в календаре. Первый клик ставит начало и обнуляет конец,
// второй — закрывает отрезок; клик раньше начала переносит начало, а не
// строит период задом наперёд. Полный отрезок клик начинает заново: так одно
