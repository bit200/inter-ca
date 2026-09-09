// Дошёл ли кандидат до конца интервью или вышел посреди него.
//
// Признак известен ровно в один момент - когда закрывается окно интервью:
// itk-live присылает либо конец собеседования (session_closed с терминальным
// статусом), либо явный выход кандидата кнопкой "Выйти" (itk.interview.exit)
// посреди диалога. Дальше по самой попытке это уже не восстановить: ходы и
// оценка у прерванной попытки выглядят так же, как у короткого, но честно
// доведённого до конца интервью - просто вопросов в ней меньше. Поэтому
// признак запоминаем на завершении (см. MockInterviewCore.handleComplete).
//
// Хранение двухслойное:
//  - interrupted на самой попытке - основной источник, его же кладём в PUT
//    /mock-interview/my-list/:id вместе со статусом;
//  - localStorage - запасной слой на том же устройстве, чтобы страница
//    результатов помнила прерванный выход и после перезагрузки, пока поле не
//    вернулось с бэкенда.
const STORE_KEY = 'mockInterviewInterrupted';

function readStore() {
    try {
        const raw = window.localStorage.getItem(STORE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
        return {};
    }
}

// Пишем и про прерванное интервью, и про доведённое до конца: вторая запись
// перекрывает первую, если кандидат прошёл ту же попытку заново.
export function rememberInterrupted(attemptId, interrupted) {
    if (attemptId === undefined || attemptId === null) return;
    try {
        const store = readStore();
        store[String(attemptId)] = !!interrupted;
        window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch (e) {}
}

export function isAttemptInterrupted(attempt) {
    if (!attempt) return false;
    if (typeof attempt.interrupted === 'boolean') return attempt.interrupted;
    return readStore()[String(attempt._id)] === true;
}

export default isAttemptInterrupted;
