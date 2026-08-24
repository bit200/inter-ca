import {
    calcRms,
    isEmptyRecording,
    createSilenceWatcher,
    SILENCE_RMS_THRESHOLD,
    MIN_VOICED_MS,
} from './silenceCheck';

function makeStream() {
    return {getTracks: () => []};
}

// Поддельный Web Audio API: analyser отдаёт уровень, который задаёт тест
function makeAudioContextCtor(levelRef) {
    return function FakeAudioContext() {
        return {
            createMediaStreamSource: () => ({connect() {}, disconnect() {}}),
            createAnalyser: () => ({
                fftSize: 2048,
                disconnect() {},
                getFloatTimeDomainData(buf) {
                    buf.fill(levelRef.value);
                },
            }),
            close() {},
        };
    };
}

describe('calcRms', () => {
    it('даёт 0 на тишине', () => {
        expect(calcRms(new Float32Array(64))).toBe(0);
    });

    it('даёт амплитуду на постоянном сигнале', () => {
        let buf = new Float32Array(64).fill(0.5);
        expect(calcRms(buf)).toBeCloseTo(0.5, 5);
    });

    it('не падает на пустом входе', () => {
        expect(calcRms(null)).toBe(0);
        expect(calcRms([])).toBe(0);
    });
});

describe('isEmptyRecording', () => {
    it('считает пустой запись, где звука не было', () => {
        expect(isEmptyRecording({supported: true, voicedMs: 0, blobSize: 12000})).toBe(true);
    });

    it('считает пустой запись короче минимума озвученного времени', () => {
        expect(isEmptyRecording({supported: true, voicedMs: MIN_VOICED_MS - 100, blobSize: 12000})).toBe(true);
    });

    it('пропускает запись, где звук был', () => {
        expect(isEmptyRecording({supported: true, voicedMs: MIN_VOICED_MS + 100, blobSize: 12000})).toBe(false);
    });

    it('считает пустым файл нулевого размера', () => {
        expect(isEmptyRecording({supported: true, voicedMs: 5000, blobSize: 0})).toBe(true);
    });

    it('не блокирует ответ, если замерить громкость не удалось', () => {
        expect(isEmptyRecording({supported: false, voicedMs: 0, blobSize: 12000})).toBe(false);
    });
});

describe('createSilenceWatcher', () => {
    it('копит озвученное время, когда в потоке есть звук', () => {
        let level = {value: SILENCE_RMS_THRESHOLD * 4};
        let ticks = [];
        let watcher = createSilenceWatcher(makeStream(), {
            frameMs: 100,
            AudioContextCtor: makeAudioContextCtor(level),
            setIntervalFn: (fn) => (ticks.push(fn), 1),
            clearIntervalFn: () => {},
        });

        for (let i = 0; i < 10; i++) ticks[0]();
        let stats = watcher.stop();

        expect(stats.supported).toBe(true);
        expect(stats.voicedMs).toBe(1000);
        expect(isEmptyRecording({...stats, blobSize: 12000})).toBe(false);
    });

    it('на тишине оставляет запись пустой и прерывает её по таймауту', () => {
        let level = {value: 0};
        let ticks = [];
        let stopped = [];
        let watcher = createSilenceWatcher(makeStream(), {
            frameMs: 100,
            silenceAutoStopMs: 500,
            onSilenceLimit: (s) => stopped.push(s),
            AudioContextCtor: makeAudioContextCtor(level),
            setIntervalFn: (fn) => (ticks.push(fn), 1),
            clearIntervalFn: () => {},
        });

        for (let i = 0; i < 10; i++) ticks[0]();
        let stats = watcher.stop();

        expect(stats.voicedMs).toBe(0);
        expect(stopped.length).toBe(1);
        expect(isEmptyRecording({...stats, blobSize: 12000})).toBe(true);
    });

    it('не считает звуком фоновый шум ниже порога', () => {
        let level = {value: SILENCE_RMS_THRESHOLD / 3};
        let ticks = [];
        let watcher = createSilenceWatcher(makeStream(), {
            frameMs: 100,
            AudioContextCtor: makeAudioContextCtor(level),
            setIntervalFn: (fn) => (ticks.push(fn), 1),
            clearIntervalFn: () => {},
        });

        for (let i = 0; i < 20; i++) ticks[0]();
        let stats = watcher.stop();

        expect(stats.voicedMs).toBe(0);
        expect(isEmptyRecording({...stats, blobSize: 12000})).toBe(true);
    });

    it('деградирует без Web Audio API, не блокируя ответ', () => {
        let watcher = createSilenceWatcher(makeStream(), {AudioContextCtor: null});
        let stats = watcher.stop();
        expect(stats.supported).toBe(false);
        expect(isEmptyRecording({...stats, blobSize: 12000})).toBe(false);
    });
});
