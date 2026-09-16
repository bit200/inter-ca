// Выбранная вкладка карточки интервью живёт в адресе (?tab=dialog): ссылкой
// можно поделиться, а перезагрузка страницы не выкидывает на первую вкладку.
// В адрес пишем короткий ключ вкладки, а не её номер: вкладка «Админ» видна
// не всем, и номер у одной и той же вкладки у разных людей разный.

export const TAB_PARAM = 'tab';

// Индекс вкладки по ключу из адреса. Неизвестный или пустой ключ - это
// вкладка по умолчанию (первая существующая), а не пустой экран.
export function tabIndexFromKey(tabs, key) {
    let list = Array.isArray(tabs) ? tabs : [];
    let fallback = list.findIndex(tab => tab);
    if (!key) return fallback;
    let index = list.findIndex(tab => tab && tab.urlKey === key);
    return index < 0 ? fallback : index;
}

export function tabKeyAt(tabs, index) {
    let tab = Array.isArray(tabs) ? tabs[index] : null;
    return tab && tab.urlKey ? tab.urlKey : '';
}
