// Отладочные метки перевода: '*' — перевод найден, '&' — перевода нет (по одной с каждой стороны).
export const FOUND_MARK = '*';
export const MISSING_MARK = '&';

// Снимает уже навешанные метки (в т.ч. многократные, от t(t(x)) и повторных рендеров).
export function stripMarks(v) {
    if (typeof v !== 'string') return v;
    let s = v;
    let prev;
    do {
        prev = s;
        let trimmed = s.trim();
        if (/^&+/.test(trimmed) && /&+$/.test(trimmed)) {
            s = trimmed.replace(/^(?:&+\s*)+/, '').replace(/(?:\s*&+)+$/, '');
        } else if (trimmed.length > 1 && trimmed[0] === FOUND_MARK && trimmed[trimmed.length - 1] === FOUND_MARK) {
            s = trimmed.slice(1, -1);
        }
    } while (s !== prev);
    return s;
}

// Оборачивает текст меткой ровно один раз.
export function markTranslation(text, found, isHttps) {
    let clean = stripMarks(text);
    if (isHttps) return clean;
    let mark = found ? FOUND_MARK : MISSING_MARK;
    return mark + clean + mark;
}

// Значение из данных (ячейка таблицы): без перевода — одна метка «&», чтобы было видно, что текст не переведён.
export function markValue(value, translated, isHttps) {
    if (!translated) return markTranslation(value, false, isHttps);
    return markTranslation(translated, true, isHttps);
}
