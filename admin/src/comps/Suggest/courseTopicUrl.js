// Выбранный топик курса хранится в URL (?topic=<id вопроса>, "check" - проверка модуля),
// чтобы после перезагрузки страницы не сбрасываться на первый топик.
export const CHECK_TOPIC = "check";

// Находит модуль и индекс топика по значению ?topic. Недоступные (maxModuleInd) и
// неизвестные топики игнорируются - тогда вернётся null и сработает выбор по умолчанию.
export function findTopicPosition(modules, topicParam, maxModuleInd = Infinity) {
    if (!topicParam) return null;
    for (let m = 0; m < (modules || []).length && m <= maxModuleInd; m++) {
        let questions = modules[m].questions || [];
        if (topicParam === CHECK_TOPIC) continue;
        let q = questions.findIndex((id) => String(id) === String(topicParam));
        if (q !== -1) return {moduleInd: m, blockInd: q};
    }
    return null;
}

export function topicParamFor(module, blockInd) {
    if (!module) return null;
    if (blockInd === -1) return CHECK_TOPIC;
    let id = (module.questions || [])[blockInd];
    return id == null ? null : String(id);
}

// Задача курса открывается в редакторе (/run) в этой же вкладке; адрес возврата едет в ?back=,
// чтобы после сабмита можно было вернуться к теме курса.
export function buildRunUrl(questionId, backPath) {
    let url = "/run?question=" + encodeURIComponent(questionId);
    return backPath ? url + "&back=" + encodeURIComponent(backPath) : url;
}

// Возврат разрешён только на путь внутри сайта: "/..." и не "//host" (открытый редирект).
export function safeBackPath(back) {
    if (typeof back !== "string" || !/^\/(?![\/\\])/.test(back)) return null;
    return back;
}
