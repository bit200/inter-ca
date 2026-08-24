// Shared matching logic behind AdviceSection - also used to compute per-turn
// advice for dialog answers (MockInterviewResults.js/MockInterviewDialogChat.js),
// so the same rule-matching behavior applies everywhere instead of being
// reimplemented (and potentially drifting) per call site.

export function getByPath(obj, path) {
    return path.split('.').reduce((cur, k) => cur != null ? cur[k] : undefined, obj);
}

export function groupAdvice(rules, schemas, result) {
    const schemaByKey = {};
    schemas.forEach(s => {
        schemaByKey[s.key] = s;
    });

    // avg_how/avg_why/avg_action are 0 by default when there are no practice
    // examples at all (count === 0) — that's not a real "too abstract" score,
    // so their advice would just contradict the "no examples" advice below.
    const practiceCount = getByPath(result, 'evaluation.practice.count');
    const hasPracticeExamples = practiceCount == null || practiceCount > 0;

    const groups = {};
    rules.forEach(rule => {
        if (!rule.key || rule.from == null || rule.to == null) return;
        if (!hasPracticeExamples && rule.key.startsWith('evaluation.practice.avg_')) return;
        const val = getByPath(result, rule.key);
        if (val == null || typeof val !== 'number') return;
        if (val < rule.from || val > rule.to) return;

        const group = schemaByKey[rule.key]?.group || 'Общее';
        if (!groups[group]) groups[group] = [];
        groups[group].push(rule);
    });
    return groups;
}
