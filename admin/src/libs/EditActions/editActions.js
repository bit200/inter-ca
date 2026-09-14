// Где у карточки редактирования стоит кнопка «Сохранить».
// По умолчанию - в шапке рядом с «Назад» и под формой. Если карточка разбита
// на вкладки и не каждой есть что сохранять (например, «Разбор диалога»
// у интервью), в конфиге ставят saveInTabs: сохранение переезжает внутрь
// тех вкладок, где оно нужно, а в шапке остаётся только «Назад».
export function saveSpots(config) {
    let inTabs = !!(config && config.saveInTabs);
    return {header: !inTabs, footer: !inTabs};
}

// Вкладкам с save: true дописывает в конец полосу сохранения.
// Остальные вкладки (и пустые места под скрытые вкладки) не трогает.
export function withTabSave(tabs, saveBar) {
    return (Array.isArray(tabs) ? tabs : []).map(tab => {
        if (!tab || !tab.save) return tab;
        return {...tab, childs: [...(tab.childs || []), saveBar]};
    });
}

// Подпись кнопки сохранения по её состоянию.
export function saveLabel(state) {
    if (state === 'saving') return 'saving';
    if (state === 'saved') return 'saved';
    return 'save';
}
