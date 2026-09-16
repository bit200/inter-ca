// Загрузка видео кандидата через S3-пайплайн мультера:
// POST {VIDEO_DOMAIN}/api/video/process (multipart, поле video) -> 202 {id, status},
// дальше опрос GET /api/video/process/:id до done|error. Мультер сам жмёт видео
// и заливает в S3, поэтому у записи UploadVideo появляется info.key - по нему
// бэкенд (uploadVideoUrl) отличает S3-загрузку от старой локальной (info.fileName).
//
// Сырой XHR, а не global.http: нужен upload.onprogress и multipart-тело,
// а global.http на 401 разлогинивает пользователя - из-за чужого домена это лишнее.

export const DEFAULT_MODE = 'compress';
export const POLL_INTERVAL_MS = 4000;

function parse(text) {
    try {
        return JSON.parse(text);
    } catch (e) {
        return {error: text};
    }
}

function request({method, url, token, body, onUploadProgress, XHR}) {
    return new Promise((resolve, reject) => {
        const xhr = new XHR();
        xhr.open(method, url, true);
        token && xhr.setRequestHeader('Authorization', token);
        if (onUploadProgress && xhr.upload) {
            xhr.upload.onprogress = (e) => {
                e.lengthComputable && onUploadProgress(Math.round(100 * e.loaded / e.total));
            };
        }
        xhr.onload = () => {
            const data = parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) {
                return resolve(data);
            }
            reject(new Error(uploadErrorMessage(data, `HTTP ${xhr.status}`)));
        };
        xhr.onerror = () => reject(new Error('Сервер загрузки не отвечает'));
        xhr.send(body || null);
    });
}

// Текст ошибки для показа человеку. Ошибки приходят в разном виде: Error,
// строка, тело ответа global.http ({msg|error|message|errmsg}, где error
// бывает и вложенным объектом) - без разбора в UI попадало «[object Object]».
// Строка «[object Object]» - это уже испорченный где-то по пути объект, в ней
// нет смысла, поэтому она считается пустой.
export function uploadErrorMessage(e, fallback = 'Неизвестная ошибка') {
    if (!e) return fallback;
    if (typeof e === 'string') return meaningful(e) || fallback;
    if (typeof e !== 'object') return String(e);
    for (const key of ['msg', 'message', 'error', 'errmsg']) {
        const v = e[key];
        if (v && typeof v === 'string' && meaningful(v)) return meaningful(v);
        if (v && typeof v === 'object') {
            const nested = uploadErrorMessage(v, '');
            if (nested) return nested;
        }
    }
    return fallback;
}

function meaningful(text) {
    const trimmed = text.trim();
    return trimmed === '[object Object]' ? '' : trimmed;
}

// global.http при оборванном соединении (сервер упал, не ответив) отдаёт пустой
// объект - текста ошибки нет вовсе, и человек видел «Неизвестная ошибка».
export const NO_RESPONSE_MESSAGE = 'сервер не ответил, запись не сохранена';

export function startVideoProcess({domain, token, file, user, mode = DEFAULT_MODE, onUploadProgress, XHR = XMLHttpRequest}) {
    const formData = new FormData();
    // Текстовые поля до файла: так они точно разобраны к моменту приёма файла.
    formData.append('mode', mode);
    user && formData.append('user', user);
    formData.append('video', file, file.name);
    return request({method: 'POST', url: `${domain}/api/video/process`, token, body: formData, onUploadProgress, XHR});
}

export async function waitVideoProcess({domain, token, id, interval = POLL_INTERVAL_MS, sleep, XHR = XMLHttpRequest}) {
    sleep = sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));
    for (;;) {
        const job = await request({method: 'GET', url: `${domain}/api/video/process/${encodeURIComponent(id)}`, token, XHR});
        if (job.status === 'done') {
            if (!job.key) {
                throw new Error('Сервер не вернул ключ загруженного видео');
            }
            return job;
        }
        if (job.status === 'error') {
            throw new Error(job.error || 'Ошибка обработки видео');
        }
        await sleep(interval);
    }
}

// info записи UploadVideo для S3-загрузки. key обязателен - без него бэкенд
// посчитает запись старой локальной и построит ссылку на static-домен.
export function buildS3UploadInfo({job, name, duration}) {
    const info = {
        key: job.key,
        contentType: job.contentType,
        fileSize: job.bytes,
        name,
        duration,
    };
    if (job.bucket) {
        info.bucket = job.bucket;
    }
    return info;
}

// Фоновая доводка: сразу после 202 от мультера фронт отдаёт jobId в
// POST /my-interview/:id/video-upload, дальше сжатие и запуск оценки доводит
// бэк (interviews/api/services/uploadVideoJobWatcher.js) - страницу можно закрыть.
export function buildJobAttachInfo({jobId, name, duration}) {
    return {jobId, name, duration};
}

// Этап передачи файла - в журнал «Разбор видео» админки
// (POST /my-interview/:id/video-upload-event, interviews/api
// controllers/interviewVideoUpload.js uploadEvent). Байты идут прямо на multer,
// и без этого API узнаёт о загрузке, только когда файл уже принят целиком.
// Сбой отправки журнала загрузку не ломает - ошибку глотаем.
export function reportUploadEvent({interviewId, http = global.http, ...event}) {
    return http.post(`/my-interview/${interviewId}/video-upload-event`, event, {wo_notify: true})
        .catch(() => {});
}

// Статус записи UploadVideo для карточки: processing - сервер ещё сжимает,
// error - сжатие упало, done - всё остальное (в т.ч. старые записи без статуса).
export function uploadVideoState(upload) {
    const status = upload && upload.status;
    if (status === 'processing' || status === 'error') {
        return status;
    }
    return 'done';
}

// Запись UploadVideo из ответа GET /my-upload-video/:id. global.http сам
// разворачивает {data} и отдаёт документ, а карточка читала r.data - получала
// undefined и сбрасывала загруженную запись, показывая дропзону заново.
// Принимаем обе формы: документ и {data: документ}.
export function uploadVideoFromResponse(r) {
    const doc = r && r.data && typeof r.data === 'object' ? r.data : r;
    return doc && doc._id ? doc : null;
}
