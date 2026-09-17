// Модель селектора периода на дежурном экране: готовые дни (позавчера — сегодня),
// готовые отрезки (прошлая неделя, месяц, квартал), свой период двумя кликами по
// календарю, шаг стрелками и человеческая подпись выбранного. Без React —
// арифметика дат проверяется юнит-тестом (src/comps/DayPicker/dayPicker.test.js).
//
// Родня этому селектору — FnsBank/PeriodRange. Общая у них календарная сетка,
// поэтому её не дублируем, а берём из fnsBankModel: сетка в админке одна.
// Отличается набор отрезков: у выписки они скользящие («месяц» = 30 дней назад),
// а дежурный смотрит закрытые календарные — «прошлый месяц» это июль целиком,
// а не «с 7 июля по 6 августа».

import {toDateValue} from './dayPickerGrid';

export {toDateValue};

// Дни, за которыми на дежурный экран приходят чаще всего. «Завтра» здесь нет:
// контроль курьеров — разбор уже отработанного, будущей смены он не показывает.
export const DAY_PRESETS = [
    {_id: 'ereyesterday', name: 'Позавчера', shift: -2},
    {_id: 'yesterday', name: 'Вчера', shift: -1},
    {_id: 'today', name: 'Сегодня', shift: 0},
];

// Закрытые календарные отрезки — ими меряют работу службы, когда день уже
// не вопрос: неделя, месяц, квартал и год целиком, без огрызка текущего.
// Подписи в одно слово: рядом с «Позавчера — Вчера — Сегодня» ряд читается
// как одна шкала времени, и «прошлый» в каждой кнопке только удлиняет её.
export const RANGE_PRESETS = [
    {_id: 'lastWeek', name: 'Неделя'},
    {_id: 'lastMonth', name: 'Месяц'},
    {_id: 'lastQuarter', name: 'Квартал'},
    {_id: 'lastYear', name: 'Год'},
];

// Сдвиг даты на сутки. Через setDate, а не через миллисекунды: перевод часов
// делает сутки не равными 24 часам, и «вчера» уезжает на тот же день.
export function shiftDay(value, delta) {
    const base = value ? new Date(value) : new Date();
    if (isNaN(base.getTime())) return toDateValue(new Date());
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + (+delta || 0));
    return toDateValue(d);
}

// Приведение значения к отрезку: строка — это сутки, у которых начало равно
// концу. Так один и тот же селектор отвечает и за день, и за период.
export function toRange(value) {
    if (!value) return {from: null, to: null};
    if (typeof value === 'string') {
        const day = toDateValue(value);
        return {from: day, to: day};
    }
    const from = toDateValue(value.from);
    const to = toDateValue(value.to);
    // Незакрытый конец не подменяем началом: пока человек выбирает свой период,
    // «конца ещё нет» и «период в один день» — разные состояния.
    if (from && to && to < from) return {from: to, to: from};
    return {from, to};
}

function safeDate(today) {
    const base = today instanceof Date ? today : new Date(today);
    return isNaN(base.getTime()) ? new Date() : base;
}

function dayOf(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// Даты готового отрезка. Границы включительные: конец — последний день периода,
// а не следующий за ним, иначе «прошлый месяц» захватывает первое число текущего.
function resolveRangePreset(preset, today) {
    const base = dayOf(safeDate(today));

    if (preset === 'lastWeek') {
        // Неделя считается с понедельника: у службы это рабочая неделя, а не
        // американская с воскресенья.
        const shift = (base.getDay() + 6) % 7;
        const monday = new Date(base.getFullYear(), base.getMonth(), base.getDate() - shift - 7);
        const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
        return {from: toDateValue(monday), to: toDateValue(sunday)};
    }
    if (preset === 'lastMonth') {
        const first = new Date(base.getFullYear(), base.getMonth() - 1, 1);
        const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
        return {from: toDateValue(first), to: toDateValue(last)};
    }
    if (preset === 'lastQuarter') {
        const q = Math.floor(base.getMonth() / 3);
        const first = new Date(base.getFullYear(), q * 3 - 3, 1);
        const last = new Date(first.getFullYear(), first.getMonth() + 3, 0);
        return {from: toDateValue(first), to: toDateValue(last)};
    }
    if (preset === 'lastYear') {
        const first = new Date(base.getFullYear() - 1, 0, 1);
        const last = new Date(base.getFullYear() - 1, 11, 31);
        return {from: toDateValue(first), to: toDateValue(last)};
    }
    return null;
}

// Отрезок готового пункта — дня или периода. Неизвестный идентификатор — это
// «сегодня»: экран обязан показывать хоть какой-то отрезок, пустого у него не бывает.
export function resolvePreset(preset, today = new Date()) {
    const range = resolveRangePreset(preset, today);
    if (range) return range;
    const hit = DAY_PRESETS.find(p => p._id === preset);
    const day = shiftDay(toDateValue(safeDate(today)), hit ? hit.shift : 0);
    return {from: day, to: day};
}

// Какой из готовых пунктов сейчас выбран — от этого зависит подсветка кнопки.
// Всё, что не совпало ни с одним, — свой период.
export function detectPreset(value, today = new Date()) {
    const range = toRange(value);
    if (!range.from || !range.to) return 'custom';
    const all = DAY_PRESETS.concat(RANGE_PRESETS);
    const hit = all.find(p => {
        const r = resolvePreset(p._id, today);
        return r.from === range.from && r.to === range.to;
    });
    return hit ? hit._id : 'custom';
}

const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

// Подпись в поле: «7 августа», год — только когда он не текущий. Дату вида
// 2026-08-07 диспетчер читает по цифрам, а день недели и месяц словами он
// узнаёт сразу — поэтому в поле словами.
export function dayLabel(value, today = new Date()) {
    const day = toDateValue(typeof value === 'string' ? value : (value || {}).from);
    if (!day) return 'дата не выбрана';
    const d = new Date(day);
    const sameYear = d.getFullYear() === safeDate(today).getFullYear();
    return d.getDate() + ' ' + MONTHS_GEN[d.getMonth()] + (sameYear ? '' : ' ' + d.getFullYear());
}

// Подпись отрезка. Внутри одного месяца месяц не повторяем — «1 — 31 июля»
// читается быстрее, чем «1 июля — 31 июля»; год ставим один раз и только чужой.
export function rangeLabel(value, today = new Date()) {
    const range = toRange(value);
    if (!range.from) return 'период не выбран';
    if (!range.to) return dayLabel(range.from, today) + ' — …';
    if (range.from === range.to) return dayLabel(range.from, today);

    const a = new Date(range.from);
    const b = new Date(range.to);
    const year = safeDate(today).getFullYear();
    const tail = b.getFullYear() === year ? '' : ' ' + b.getFullYear();
    const sameMonth = a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
    const head = sameMonth
        ? String(a.getDate())
        : a.getDate() + ' ' + MONTHS_GEN[a.getMonth()]
        + (a.getFullYear() === b.getFullYear() ? '' : ' ' + a.getFullYear());
    return head + ' — ' + b.getDate() + ' ' + MONTHS_GEN[b.getMonth()] + tail;
}

// Название выбранного готового пункта рядом с датой — так видно, почему стоит
// именно этот отрезок. У произвольного его нет, и подписывать его нечем.
export function presetName(value, today = new Date()) {
    const all = DAY_PRESETS.concat(RANGE_PRESETS);
    const hit = all.find(p => p._id === detectPreset(value, today));
    return hit ? hit.name : '';
}

// Сколько суток в отрезке — на столько же стрелки его и двигают.
export function rangeSpan(value) {
    const range = toRange(value);
    if (!range.from || !range.to) return 1;
    const a = new Date(range.from);
    const b = new Date(range.to);
    return Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
}

// Шаг стрелками: день уходит на сутки, отрезок — на свою длину целиком.
// Неделя стрелкой влево даёт предыдущую целиком, а не «неделю минус день».
export function shiftRange(value, delta) {
    const range = toRange(value);
    if (!range.from) return resolvePreset('today');
    const step = rangeSpan(range) * (+delta || 0);
    return {from: shiftDay(range.from, step), to: shiftDay(range.to || range.from, step)};
}

// Клик по числу в календаре. Первый ставит начало и обнуляет конец, второй —
// закрывает период; клик раньше начала переносит начало, а не строит отрезок
// задом наперёд. Готовый отрезок клик начинает заново: одно и то же нажатие
// всегда значит одно и то же, без «сначала снимите старый».
export function pickDay(value, day) {
    const range = toRange(value);
    const next = toDateValue(day);
    if (!next) return range;
    if (!range.from || range.to) return {from: next, to: null};
    if (next < range.from) return {from: next, to: null};
    return {from: range.from, to: next};
}

// Место дня в отрезке — от него зависит подсветка: концы закрашены, середина
// лежит на ленте.
export function dayState(value, day, today = null) {
    const range = toRange(value);
    const v = toDateValue(day);
    return {
        from: !!v && v === range.from,
        to: !!v && v === (range.to || range.from),
        inside: !!v && !!range.from && !!range.to && v > range.from && v < range.to,
        today: !!v && !!today && v === toDateValue(today),
    };
}
