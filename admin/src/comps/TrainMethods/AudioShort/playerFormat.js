// Форматирование и «волна» для нижнего плеера — вынесено отдельно, чтобы покрыть тестами

export const playbackRates = [0.75, 1, 1.25, 1.5, 2];
export const playerSeekStepSeconds = 15;

// 0:07, 2:11, 1:04:09 — часы появляются только когда они есть
export function formatPlayerClock(seconds) {
    let total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
    let minutes = String(Math.floor(total / 60) % 60).padStart(total >= 3600 ? 2 : 1, '0');
    let tail = `${minutes}:${String(total % 60).padStart(2, '0')}`;
    return total >= 3600 ? `${Math.floor(total / 3600)}:${tail}` : tail;
}

export function formatPlaybackRate(rate) {
    return `${String(rate).replace('.', ',')}×`;
}

// Стабильная псевдослучайная волна: у одной записи она всегда одна и та же.
// Столбиков немного — плеер узкий, при 40 волна не помещалась и обрезалась.
export function waveformBars(seed, count = 22) {
    let state = 0;
    for (let char of String(seed || 'запись')) state = (state * 31 + char.charCodeAt(0)) % 2147483647;
    return Array.from({length: count}, (_, index) => {
        state = (state * 1103515245 + 12345) % 2147483647;
        let noise = state / 2147483647;
        let envelope = 0.55 + 0.45 * Math.sin((index / count) * Math.PI * 3.1);
        return Math.round((0.22 + 0.78 * noise * envelope) * 100) / 100;
    });
}
