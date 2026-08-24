// Проценты по группам показателей ("Речь", "Практика", ...). Жили внутри
// AdviceSection, но теперь те же числа нужны и шапке страницы (она называет
// самое слабое место), поэтому расчёт лежит отдельно - иначе шапка и таблица
// метрик считали бы одно и то же двумя способами и разошлись бы.
import { getByPath } from './adviceLogic';

// eval-metric-schemas already carries each key's real scale (min/max) - that's
// the source of truth for normalization. Advice-rule ranges only cover the
// spans someone wrote advice text for (e.g. relevance rules stop at 7.5, not
// the metric's real max of 9), so using them for normalization silently
// shrinks the scale and skews every percent below 100%'s worth of coverage.
export function buildMetricRanges(schemas) {
    const ranges = {};
    schemas.forEach(s => {
        if (!s.key || s.min == null || s.max == null) return;
        ranges[s.key] = { min: s.min, max: s.max };
    });
    return ranges;
}

// Every row is displayed as "how good is this parameter" (full green bar = good,
// matching the overall score above it) - but the raw normalized value only means
// that for metrics where higher is better (речь, практика, ...). For a metric
// like is_offtop or errors, the underlying value is "how much of a bad thing",
// so a raw 0 (the best possible outcome) must normalize to 100% ("good"), not
// 0% - and a raw 1 (worst) must read as 0%. metricSchemas don't currently carry
// an explicit direction flag - if the backend schema object ever adds one (e.g.
// `invert`/`lowerIsBetter`), prefer it over this name-based guess. Checked per
// KEY (not per group) because a group can mix directions - "Релевантность" has
// both evaluation.relevance.relevance (higher is better) and
// evaluation.relevance.is_offtop (lower is better); averaging their raw percents
// without inverting is_offtop first previously let is_offtop:1 (worst case)
// contribute 100% to the group average instead of 0%.
export function isLowerBetterKey(key, schema) {
    if (schema && typeof schema.invert === 'boolean') return schema.invert;
    if (schema && typeof schema.lowerIsBetter === 'boolean') return schema.lowerIsBetter;
    return /is_offtop|is_critical|\berror|fillers\.count/i.test(key || '');
}

export function buildGroupPercents(schemas, result) {
    const ranges = buildMetricRanges(schemas);
    const schemaByKey = {};
    schemas.forEach(s => { schemaByKey[s.key] = s; });

    const groupValues = {};
    const groupAllInverted = {};
    Object.keys(ranges).forEach(key => {
        const val = getByPath(result, key);
        if (val == null || typeof val !== 'number') return;
        const { min, max } = ranges[key];
        if (max <= min) return;
        const rawPct = Math.max(0, Math.min(1, (val - min) / (max - min))) * 100;
        const inverted = isLowerBetterKey(key, schemaByKey[key]);
        // Invert per-key BEFORE averaging into the group, so a mixed-direction
        // group (see comment above) averages "how good", not raw normalized value.
        const pct = inverted ? 100 - rawPct : rawPct;
        const group = schemaByKey[key]?.group || 'Общее';
        (groupValues[group] = groupValues[group] || []).push(pct);
        // Only used for the row label below - a group's label flips to "Без
        // ошибок" only when EVERY metric in it is inverted (e.g. "Ошибки", a
        // single is_critical key), not for a mixed group like "Релевантность"
        // whose already-inverted-and-averaged percent reads correctly as-is.
        if (!(group in groupAllInverted)) groupAllInverted[group] = true;
        groupAllInverted[group] = groupAllInverted[group] && inverted;
    });

    return Object.keys(groupValues).map(group => {
        const pct = Math.round(groupValues[group].reduce((a, b) => a + b, 0) / groupValues[group].length);
        // The percent already reads as "how good", so an all-inverted group's own
        // name ("Ошибки") would read backwards next to it (100% Ошибки = зелёным?!) -
        // flip the label to match what the number actually means. The raw `group`
        // is kept as the row/modal key (adviceByGroup, data-group, ...) so this is
        // display-only.
        const label = groupAllInverted[group] ? 'Без ошибок' : group;
        return { group, label, pct };
    });
}

// Самая слабая группа - то, что шапка показывает как "слабое место", а колонка
// метрик выносит наверх советов. Группы у потолка слабым местом не считаются:
// называть "слабым" показатель на 90% - врать читателю.
export const WEAK_PCT = 70;

export function weakestGroup(rows) {
    return rows.reduce((worst, row) => {
        if (row.pct >= WEAK_PCT) return worst;
        return !worst || row.pct < worst.pct ? row : worst;
    }, null);
}
