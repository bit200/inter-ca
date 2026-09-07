// Старт попытки мок-интервью: reserve -> embed-session -> отметить попытку
// начатой. Вынесено из MockInterviewCore, потому что этот же поток нужен и
// без экрана-обёртки: со страницы курса кнопка "Проверить знания" открывает
// iframe напрямую, минуя карточку старта и историю попыток.
//
// Бэкенд создаёт одноразовый embed_url через issuer-токен ITK_EMBED_API_KEY
// (см. docs/contracts/embed-interview-iframe.md в itk-live) - сам токен на
// фронт никогда не попадает, iframe открывается сразу на готовый embed_url.

export const BUSY_MESSAGE = 'Интервью сейчас занято другим пользователем. Попробуйте открыть позже.';
export const RESERVE_ERROR_MESSAGE = 'Не удалось забронировать интервью. Попробуйте ещё раз.';

// onReserve вызывается сразу после успешной брони (вызывающая сторона обязана
// её потом отпустить), onRelease - если дальше по пути что-то упало.
// Ошибку пробрасываем наверх с готовым текстом и флагом busy: показать её
// карточкой старта или уйти на запасной сценарий - решает вызывающий.
export function startInterviewAttempt(attemptItem, {onReserve, onRelease} = {}) {
    return global.http.post(`/mock-interview/my-list/${attemptItem._id}/reserve`, {}, {wo_notify: true})
        .then(() => {
            onReserve && onReserve();
            return global.http.post(`/mock-interview/my-list/${attemptItem._id}/embed-session`, {
                parentOrigin: window.location.origin,
            }, {wo_notify: true});
        })
        .then((session) => {
            global.http.put(`/mock-interview/my-list/${attemptItem._id}`, {
                sessionId: session.sessionId,
                status: 'started',
            }, {wo_notify: true});
            return {...attemptItem, embedUrl: session.embedUrl, sessionId: session.sessionId};
        })
        .catch((e) => {
            onRelease && onRelease();
            const busy = e?.error === 'busy';
            const err = new Error(busy ? BUSY_MESSAGE : RESERVE_ERROR_MESSAGE);
            err.busy = busy;
            throw err;
        });
}

export default startInterviewAttempt;
