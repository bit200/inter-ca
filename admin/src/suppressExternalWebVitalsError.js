// В проде в консоли всплывает ошибка стороннего скрипта (расширение браузера или
// внешний счётчик, в DevTools виден как VM<N>):
//   Uncaught TypeError: Cannot read properties of undefined (reading 'startTime')
//       at et.reportAllChanges (<anonymous>:2:19429)
// Наш бандл в стеке не участвует и на работу квиза она не влияет, поэтому просто
// не даём ей засорять консоль.

const MESSAGE_RE = /Cannot read (?:property 'startTime' of undefined|properties of undefined \(reading 'startTime'\))/;

export function isExternalWebVitalsError({message, filename, error} = {}) {
    const text = String(message || (error && error.message) || '');
    if (!MESSAGE_RE.test(text)) return false;
    // Ошибка из нашего бандла (у него есть нормальный filename) — не глушим.
    if (filename) return false;
    const stack = String((error && error.stack) || '');
    return stack.includes('reportAllChanges') || stack.includes('<anonymous>') || stack === '';
}

export default function suppressExternalWebVitalsError(target = typeof window !== 'undefined' ? window : null) {
    if (!target || !target.addEventListener) return () => {};
    const handler = event => {
        if (!isExternalWebVitalsError(event)) return;
        event.preventDefault();
        if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
    };
    target.addEventListener('error', handler, true);
    return () => target.removeEventListener('error', handler, true);
}
