// В dev горячее обновление может сломаться на полпути: правка добавила импорт
// (например, модалку с markdown), а в hot-update не попала фабрика транзитивного
// модуля из node_modules. Тогда клиент падает с
//   Uncaught TypeError: Cannot read properties of undefined (reading 'call')
//       at __webpack_require__ ... at fn (hot module replacement)
// и остаётся сломанным до ручной перезагрузки. Webpack в этот момент переводит
// HMR в статус 'abort' или 'fail' — на нём и перезагружаем страницу целиком.

export const FAILED_STATUSES = ['abort', 'fail'];

export default function reloadOnFailedHotUpdate(hot, reload = () => window.location.reload()) {
    if (!hot || typeof hot.addStatusHandler !== 'function') return () => {};
    let reloading = false;
    const handler = status => {
        if (reloading || !FAILED_STATUSES.includes(status)) return;
        reloading = true;
        reload();
    };
    hot.addStatusHandler(handler);
    return () => {
        if (typeof hot.removeStatusHandler === 'function') hot.removeStatusHandler(handler);
    };
}
