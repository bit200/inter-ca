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
            reject(new Error((data && data.error) || `HTTP ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error('Сервер загрузки не отвечает'));
        xhr.send(body || null);
    });
}

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

// Статус записи UploadVideo для карточки: processing - сервер ещё сжимает,
// error - сжатие упало, done - всё остальное (в т.ч. старые записи без статуса).
export function uploadVideoState(upload) {
    const status = upload && upload.status;
    if (status === 'processing' || status === 'error') {
        return status;
    }
    return 'done';
}
