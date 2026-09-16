// Разметка ролей, когда автоматически их не определили ни меш, ни llm
// (videoEvaluateState.rolesPending на бэке, services/interviewAutoPipeline.js).
// Оценка ответов стоит, пока человек не отметит, кто интервьюер, а кто кандидат.

// Черновик ролей в уведомлении. У двух участников хватает одного выбора:
// второй получает противоположную роль сам - в интервью их ровно двое.
export function draftWithRole(speakers, draft, key, role) {
    let next = {...(draft || {}), [key]: role};
    let list = speakers || [];
    if (list.length === 2) {
        let other = list.find(entry => entry.key !== key);
        if (other) next[other.key] = role === 'manager' ? 'client' : 'manager';
    }
    return next;
}

// Продолжать оценку можно, когда в разметке есть и интервьюер, и кандидат,
// и роль стоит у каждого участника.
export function draftComplete(speakers, draft) {
    let map = draft || {};
    let list = speakers || [];
    if (!list.length || list.some(entry => map[entry.key] !== 'manager' && map[entry.key] !== 'client')) return false;
    let roles = new Set(list.map(entry => map[entry.key]));
    return roles.has('manager') && roles.has('client');
}

// Стартовый черновик: ручные роли прошлых правок, иначе ничего - автоматическая
// роль тут 'unknown' или одна на всех, подставлять её нечего.
export function initialDraft(speakers, savedRoles) {
    let saved = savedRoles || {};
    let draft = {};
    (speakers || []).forEach(entry => {
        let role = saved[entry.key];
        if (role === 'manager' || role === 'client') draft[entry.key] = role;
    });
    return draft;
}

// Сохранять ли ручную правку роли на бэке. Пока оценка ждёт ролей или правка
// только что сделала их полными - да: бэк положит роли в разбор и продолжит
// оценку сам. Остальные правки - только подпись в ленте, пересчёт по ним
// не запускаем.
export function shouldSendRoles({rolesPending, justCompleted}) {
    return Boolean(rolesPending || justCompleted);
}
