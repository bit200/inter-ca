export const groupItems = (items, mode) => {
    const order = [];
    const map = {};

    items.forEach(item => {
        //skip exams from modules
        if(mode === 'module' && item.exam){
            return
        }

        //skip modules from exam
        if(mode === 'exam' && !item.exam){
            return
        }

        const key = mode === 'module'
            ? (item.titleInfo?.moduleInfo?.name || 'Без модуля')
            : String(item.exam ?? 'unknown');
        if (!map[key]) {
            map[key] = [];
            order.push(key);
        }
        map[key].push(item);
    });
    return order.map(key => ({ key, items: map[key] }));
}


// Дата диктовки (item.cd - когда человек надиктовал ответ), а не дата оценки:
// оценка могла прийти пачкой много позже ответов и порядок по ней ничего не
// говорит о том, когда человек отвечал. Записи без даты - всегда в конце,
// в любом направлении: их место неизвестно, и подмешивать их в начало нельзя.
export const SORT_ORDERS = ['new', 'old'];

export const sortByDictationDate = (items, order = 'new') => {
    const time = item => {
        const ms = Date.parse(item?.cd ?? '');
        return Number.isNaN(ms) ? null : ms;
    };
    return [...items].sort((a, b) => {
        const ta = time(a), tb = time(b);
        if (ta === null || tb === null) {
            return ta === tb ? 0 : ta === null ? 1 : -1;
        }
        return order === 'old' ? ta - tb : tb - ta;
    });
}

export const SORT_MODES = ['desc', 'asc'];

const getScore = item => item?.evaluate?.result?.score;

// Записи без балла (ожидают/оцениваются) всегда внизу, в обоих направлениях:
// в сортировке "сначала низкие" пустая оценка - не самая низкая, её просто
// ещё нет, и наверху она вытеснила бы то, ради чего сортировку и включили.
export const sortItemsByScore = (items, sort) => {
    if (!SORT_MODES.includes(sort)) {
        return items;
    }
    const dir = sort === 'asc' ? 1 : -1;
    return [...items].sort((a, b) => {
        const sa = getScore(a);
        const sb = getScore(b);
        if (sa == null && sb == null) return 0;
        if (sa == null) return 1;
        if (sb == null) return -1;
        return (sa - sb) * dir;
    });
}
