/**
 * Пустая надиктовка (микрофон молчал) не должна уезжать на сервер:
 * recognitionStart обязан отдать её в onEmptyAudio, а не в completeCb.
 */
global.env = {VIDEO_DOMAIN: 'http://video.test', domain: 'http://test'};
global.Storage = {get: () => null, set: () => null};
global.user = {get_id: () => 'u1'};
global.t = (k) => k;
global.webkitSpeechRecognition = function () {
    return {start() {}, stop() {}};
};

jest.mock('axios', () => ({__esModule: true, default: {get: () => Promise.resolve({}), post: () => Promise.resolve({})}}));
jest.mock('../../../App', () => ({stopAnyPlay: () => null}));
jest.mock('@uiw/react-md-editor', () => ({__esModule: true, default: () => null, commands: {}}));
jest.mock('../../Suggest/MdPreview', () => ({__esModule: true, default: () => null}));

// require, а не import: глобалы выше должны быть готовы до загрузки модуля
const {recognitionInit, recognitionStart, recognitionStop} = require('./AudioShort');
const {SILENCE_RMS_THRESHOLD} = require('./silenceCheck');

let recorders;

function setupMic(level) {
    recorders = [];

    global.URL.createObjectURL = () => 'blob:audio';

    global.MediaRecorder = function () {
        let rec = {
            start() {},
            stop() {
                rec.onstop && rec.onstop();
            },
        };
        recorders.push(rec);
        return rec;
    };

    global.AudioContext = function () {
        return {
            createMediaStreamSource: () => ({connect() {}, disconnect() {}}),
            createAnalyser: () => ({
                fftSize: 2048,
                disconnect() {},
                getFloatTimeDomainData: (buf) => buf.fill(level),
            }),
            close() {},
        };
    };

    global.navigator.mediaDevices = {
        getUserMedia: () => Promise.resolve({getTracks: () => []}),
    };
}

function pushChunk() {
    recorders[0].ondataavailable({data: {size: 4096}});
}

beforeEach(() => {
    jest.useFakeTimers();
    recognitionInit();
});

afterEach(() => {
    jest.useRealTimers();
});

it('не отправляет запись, в которой не было звука', async () => {
    setupMic(0);
    let completed = [];
    let empty = [];

    recognitionStart(null, (...a) => completed.push(a), {onEmptyAudio: (s) => empty.push(s)});
    await Promise.resolve();

    pushChunk();
    jest.advanceTimersByTime(3000);
    recognitionStop();

    expect(completed.length).toBe(0);
    expect(empty.length).toBe(1);
    expect(empty[0].voicedMs).toBe(0);
});

it('отправляет запись, в которой звук был', async () => {
    setupMic(SILENCE_RMS_THRESHOLD * 4);
    let completed = [];
    let empty = [];

    recognitionStart(null, (...a) => completed.push(a), {onEmptyAudio: (s) => empty.push(s)});
    await Promise.resolve();

    pushChunk();
    jest.advanceTimersByTime(3000);
    recognitionStop();

    expect(empty.length).toBe(0);
    expect(completed.length).toBe(1);
});

it('сам прерывает надиктовку, если микрофон молчит слишком долго', async () => {
    setupMic(0);
    let empty = [];

    recognitionStart(null, () => {}, {onEmptyAudio: (s) => empty.push(s), silenceAutoStopMS: 1000});
    await Promise.resolve();

    pushChunk();
    jest.advanceTimersByTime(1200);

    expect(empty.length).toBe(1);
});
