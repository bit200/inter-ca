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
