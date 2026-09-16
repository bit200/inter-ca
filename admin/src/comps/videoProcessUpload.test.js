import fs from 'fs';
import path from 'path';
import {startVideoProcess, waitVideoProcess, buildS3UploadInfo, buildJobAttachInfo, uploadVideoState, DEFAULT_MODE, uploadErrorMessage, reportUploadEvent} from './videoProcessUpload';

// Поддельный XHR: отвечает по очереди из responses и запоминает запросы
function makeXHR(responses, log) {
    return function FakeXHR() {
        const req = {headers: {}, upload: {}};
        this.upload = req.upload;
        this.open = (method, url) => Object.assign(req, {method, url});
        this.setRequestHeader = (k, v) => { req.headers[k] = v; };
        this.send = (body) => {
            req.body = body;
            log.push(req);
            const [status, data] = responses.shift();
            setTimeout(() => {
                this.upload.onprogress && this.upload.onprogress({lengthComputable: true, loaded: 50, total: 100});
                this.status = status;
                this.responseText = JSON.stringify(data);
                this.onload();
            }, 0);
        };
    };
}

describe('startVideoProcess', () => {
    it('шлёт один multipart POST на /api/video/process с токеном, video и mode', async () => {
        const log = [];
        const progress = [];
        const file = new File(['abc'], 'interview.mp4', {type: 'video/mp4'});
        const res = await startVideoProcess({
            domain: 'http://multer.test', token: 'tkn', file, user: 'u1',
            onUploadProgress: (p) => progress.push(p),
            XHR: makeXHR([[202, {id: 'j1', status: 'queued'}]], log),
        });
        expect(res).toEqual({id: 'j1', status: 'queued'});
        expect(log).toHaveLength(1);
        expect(log[0].method).toBe('POST');
        expect(log[0].url).toBe('http://multer.test/api/video/process');
        expect(log[0].headers.Authorization).toBe('tkn');
        expect(log[0].body.get('mode')).toBe(DEFAULT_MODE);
        expect(log[0].body.get('user')).toBe('u1');
        expect(log[0].body.get('video').name).toBe('interview.mp4');
        expect(progress).toEqual([50]);
    });

    it('отдаёт ошибку сервера текстом', async () => {
        const file = new File(['abc'], 'a.mp4');
        await expect(startVideoProcess({
            domain: 'http://m', token: 't', file,
            XHR: makeXHR([[401, {error: 'unauthorized'}]], []),
        })).rejects.toThrow('unauthorized');
    });
});

describe('waitVideoProcess', () => {
    it('опрашивает job до done с паузой между запросами', async () => {
        const log = [];
        const sleeps = [];
        const job = await waitVideoProcess({
            domain: 'http://m', token: 't', id: 'j1', interval: 4000,
            sleep: async (ms) => sleeps.push(ms),
            XHR: makeXHR([
                [200, {status: 'queued'}],
                [200, {status: 'processing'}],
                [200, {status: 'done', key: 'u1/v.mp4', contentType: 'video/mp4', bytes: 10}],
            ], log),
        });
        expect(job.key).toBe('u1/v.mp4');
        expect(log.map((r) => r.url)).toEqual(Array(3).fill('http://m/api/video/process/j1'));
        expect(log[0].headers.Authorization).toBe('t');
        expect(sleeps).toEqual([4000, 4000]);
    });

    it('status error превращает в исключение', async () => {
        await expect(waitVideoProcess({
            domain: 'http://m', token: 't', id: 'j1', sleep: async () => {},
            XHR: makeXHR([[200, {status: 'error', error: 'ffmpeg failed'}]], []),
        })).rejects.toThrow('ffmpeg failed');
    });
});

describe('buildS3UploadInfo', () => {
    it('кладёт key, contentType, fileSize, name, duration', () => {
        expect(buildS3UploadInfo({
            job: {key: 'u1/v.mp4', contentType: 'video/mp4', bytes: 123},
            name: 'interview.mp4', duration: 12.5,
        })).toEqual({key: 'u1/v.mp4', contentType: 'video/mp4', fileSize: 123, name: 'interview.mp4', duration: 12.5});
    });
});

describe('UploadVideo', () => {
    it('больше не грузит чанками на /video-upload, а идёт через /api/video/process', () => {
        const src = fs.readFileSync(path.join(__dirname, 'UploadVideo.js'), 'utf8');
        expect(src).not.toMatch(/\/video-upload/);
        expect(src).not.toMatch(/file\.slice\(/);
        expect(src).toMatch(/startVideoProcess/);
        expect(src).toMatch(/buildS3UploadInfo/);
    });
});

describe('фоновая доводка загрузки', () => {
    it('в API уходит jobId сразу после приёма файла, без ключа S3', () => {
        expect(buildJobAttachInfo({jobId: 'j1', name: 'a.mp4', duration: 3})).toEqual({jobId: 'j1', name: 'a.mp4', duration: 3});
    });

    it('uploadVideoState: processing и error - как есть, остальное (и старые записи) - done', () => {
        expect(uploadVideoState({status: 'processing'})).toBe('processing');
        expect(uploadVideoState({status: 'error'})).toBe('error');
        expect(uploadVideoState({status: 'loading', info: {key: 'k'}})).toBe('done');
        expect(uploadVideoState(null)).toBe('done');
    });

    it('карточка интервью не ждёт сжатия в браузере', () => {
        const src = fs.readFileSync(path.join(__dirname, 'Interview', 'InterviewVideoUpload.jsx'), 'utf8');
        expect(src).not.toMatch(/waitVideoProcess/);
        expect(src).toMatch(/buildJobAttachInfo/);
        expect(src).not.toMatch(/страницу не закрывайте/);
    });
});

describe('uploadErrorMessage', () => {
    it('достаёт текст из Error, строки и тела ответа global.http, а не «[object Object]»', () => {
        expect(uploadErrorMessage(new Error('Сервер загрузки не отвечает'))).toBe('Сервер загрузки не отвечает');
        expect(uploadErrorMessage('Файл слишком большой')).toBe('Файл слишком большой');
        expect(uploadErrorMessage({msg: 'Интервью не найдено'})).toBe('Интервью не найдено');
        expect(uploadErrorMessage({error: {message: 'Нет доступа'}})).toBe('Нет доступа');
        expect(uploadErrorMessage({errmsg: 'E11000'})).toBe('E11000');
    });

    it('без текста - запасная фраза', () => {
        expect(uploadErrorMessage({})).toBe('Неизвестная ошибка');
        expect(uploadErrorMessage(null, 'HTTP 500')).toBe('HTTP 500');
    });

    it('startVideoProcess отдаёт текст вложенной ошибки мультера', async () => {
        const file = new File(['abc'], 'a.mp4', {type: 'video/mp4'});
        const XHR = makeXHR([[500, {error: {message: 'Диск переполнен'}}]], []);
        await expect(startVideoProcess({domain: 'http://m', token: 't', file, XHR})).rejects.toThrow('Диск переполнен');
    });

    it('карточка интервью и страница /video показывают ошибку через uploadErrorMessage', () => {
        for (const f of ['Interview/InterviewVideoUpload.jsx', 'UploadVideo.js']) {
            const src = fs.readFileSync(path.join(__dirname, f), 'utf8');
            expect(src).toContain('setErr(uploadErrorMessage(e))');
            expect(src).not.toContain('e.message || e.toString()');
        }
    });
});

describe('reportUploadEvent', () => {
    it('шлёт этап загрузки в журнал интервью без уведомлений', async () => {
        const calls = [];
        const http = {post: (...args) => { calls.push(args); return Promise.resolve({ok: true}); }};
        await reportUploadEvent({interviewId: 1004, http, event: 'started', name: 'a.mp4', fileSize: 1000, duration: 3});
        expect(calls).toEqual([['/my-interview/1004/video-upload-event', {event: 'started', name: 'a.mp4', fileSize: 1000, duration: 3}, {wo_notify: true}]]);
    });

    it('сбой отправки журнала не роняет загрузку', async () => {
        const http = {post: () => Promise.reject(new Error('offline'))};
        await expect(reportUploadEvent({interviewId: 1004, http, event: 'progress', percent: 25})).resolves.toBeUndefined();
    });
});
