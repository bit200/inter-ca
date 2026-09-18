// Где нарисовать окно календаря относительно поля.
//
// Раньше окно было обычным absolute-блоком внутри формы: в модалке «Добавить
// трату» оно упиралось в её прокрутку — низ календаря срезался, а сам он
// вылезал вправо, на соседние поля («Период», «periodsN»). Теперь окно висит
// на body в fixed-координатах, и посчитать их нужно здесь: по левому краю
// поля, с переворотом вверх, когда снизу места нет.
//
// Экспорт — ESM: функцию импортируют через import {placePopup}, и сборка
// прод-бандла на CommonJS-экспорте такой импорт не находит.

export const GAP = 4;      // просвет между полем и окном
export const MARGIN = 8;   // сколько не доводим до края экрана

// rect — поле (getBoundingClientRect), view — {width, height} окна браузера.
export function placePopup(rect, view, size) {
    const {width = 288, height = 300} = size || {};
    const gap = GAP;
    const margin = MARGIN;

    // По горизонтали окно продолжает поле: тот же левый край, что у поля, —
    // календарь читается как его раскрытие, а не как отдельный блок сбоку.
    // За правый край экрана не пускаем, прижимая окно к нему.
    let left = rect.left;
    if (left + width > view.width - margin) left = view.width - margin - width;
    if (left < margin) left = margin;

    // По вертикали — под полем, но если снизу не помещается, а сверху места
    // хватает, разворачиваем вверх: обрезанный календарь бесполезен.
    const below = rect.bottom + gap;
    const above = rect.top - gap - height;
    const fitsBelow = below + height <= view.height - margin;
    const flip = !fitsBelow && above >= margin;
    let top = flip ? above : below;

    // Экран ниже календаря целиком (мелкое окно) — сажаем его как получится,
    // но не выше верхней кромки: верх с месяцем и днями важнее подсказки внизу.
    if (!flip && top + height > view.height - margin) {
        top = Math.max(margin, view.height - margin - height);
    }
    if (top < margin) top = margin;

    return {left: Math.round(left), top: Math.round(top), flip};
}
