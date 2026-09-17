// Куда ведёт «Назад» в карточке редактирования.
// По умолчанию - шаг назад по истории. Если в конфиге задан backTo
// (например, у интервью), кнопка всегда уводит на этот адрес - обычно список
// сущности - и подписывается своим ключом перевода, если он указан.
export function backTarget(config) {
    let backTo = config && config.backTo;
    if (!backTo) return {to: -1, label: 'back'};
    if (typeof backTo === 'string') return {to: backTo, label: 'back'};
    return {to: backTo.url || -1, label: backTo.label || 'back'};
}
