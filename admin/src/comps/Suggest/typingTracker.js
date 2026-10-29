// История набора кода для ИИ-проверки (критерий «Процесс решения»): снимки кода уходят на
// /code-typing под одним hash, а hash — в /run-question как typingHash. Без этого сервер
// не находит историю и ставит нейтральные 5/10 («история набора не сохранялась»).
const SEND_DELAY_MS = 1500;

export function createTypingTracker({post, now = () => Date.now(), delay = SEND_DELAY_MS, setTimer = setTimeout, clearTimer = clearTimeout} = {}) {
    const startedAt = now();
    const hash = `typing-${startedAt}-${Math.random().toString(36).slice(2, 10)}`;
    let timer = null;
    let pending = null;
    let sent = false;

    function flush() {
        clearTimer(timer);
        timer = null;
        if (!pending) return;
        const data = pending;
        pending = null;
        sent = true;
        try {
            Promise.resolve(post({hash, data})).catch(() => {});
        } catch (e) {}
    }

    function change(code, activeFileInd = 0) {
        pending = {code: code || '', activeFileInd: String(activeFileInd), time: Math.round((now() - startedAt) / 1000)};
        if (!timer) timer = setTimer(flush, delay);
    }

    // hash отдаём только если хоть один снимок реально ушёл: иначе сервер ищет пустую историю
    function getHash() {
        flush();
        return sent ? hash : undefined;
    }

    return {change, flush, getHash, hash};
}
