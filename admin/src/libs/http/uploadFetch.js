// fetch к загрузчику (multer) с токеном пользователя в Authorization (как есть,
// без "Bearer "). Загрузчик отвечает 401 на протухший токен: обновляем токен тем
// же механизмом, что и global.http, и повторяем запрос один раз, чтобы не терять
// длинную запись. body должен быть повторно отправляемым (FormData/Blob).
export function uploadFetch(url, opts = {}, deps = {}) {
    const user = deps.user || global.user;
    const send = () => fetch(url, {
        ...opts,
        headers: {...(opts.headers || {}), authorization: user.get_token() || ''},
    });
    return send().then(res => {
        if (res.status !== 401 || !user.get_refresh_token()) {
            return res;
        }
        return new Promise((resolve, reject) => {
            user.on_refresh_token(() => send().then(resolve, reject), reject);
        });
    });
}
