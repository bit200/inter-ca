// Сколько делений закрасить в чипе показателя. Одна шкала на все чипы линейки -
// и на общую оценку (0-10), и на показатели (0-100%): в этом весь смысл
// сегментов, разные шкалы читались бы как разная точность измерения.
export const SEGMENTS = 5;

export function filledSegments(value, max = 100, segments = SEGMENTS) {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0 || max <= 0) return 0;
    const t = Math.min(1, num / max);
    // Пустой чип означает "ноль". Значение меньше половины деления - это не
    // ноль, а очень мало, поэтому одно деление горит всегда.
    return Math.max(1, Math.round(t * segments));
}

export default filledSegments;
