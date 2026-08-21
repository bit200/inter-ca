/**
 * Проверка того, что в записи ответа реально есть голос пользователя.
 * Нужна, чтобы вместо пустой (тишина / выключенный или чужой микрофон)
 * надиктовки показать ошибку и не отправлять её на сервер.
 */

// Порог громкости кадра (RMS амплитуды в диапазоне 0..1), выше которого
// считаем, что в кадре есть звук, а не шум микрофона.
export const SILENCE_RMS_THRESHOLD = 0.015;

// Сколько миллисекунд звука должно набраться за запись, чтобы считать её непустой.
export const MIN_VOICED_MS = 250;

// Через сколько миллисекунд полной тишины запись прерывается сама.
export const SILENCE_AUTO_STOP_MS = 8000;

/**
 * Среднеквадратичная громкость кадра.
 * @param {ArrayLike<number>} samples отсчёты в диапазоне -1..1
 */
export function calcRms(samples) {
    if (!samples || !samples.length) {
        return 0;
    }
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
        let v = samples[i];
        sum += v * v;
    }
    return Math.sqrt(sum / samples.length);
}

/**
 * Решение по собранной статистике: запись пустая?
 * Если замерить громкость не удалось (supported=false) — не блокируем ответ,
 * ловим только заведомо пустой файл.
 */
export function isEmptyRecording(stats, opts = {}) {
    let {supported, voicedMs = 0, blobSize} = stats || {};
    let {minVoicedMs = MIN_VOICED_MS} = opts;

    if (blobSize === 0) {
        return true;
    }
    if (!supported) {
        return false;
    }
    return voicedMs < minVoicedMs;
}

/**
 * Слушает поток с микрофона и копит статистику громкости.
 * Возвращает {stop, getStats}; stop() отдаёт итоговую статистику.
 * Если Web Audio API недоступен — молча деградирует (supported=false).
 */
export function createSilenceWatcher(stream, opts = {}) {
    let {
        threshold = SILENCE_RMS_THRESHOLD,
        minVoicedMs = MIN_VOICED_MS,
        frameMs = 100,
        silenceAutoStopMs = SILENCE_AUTO_STOP_MS,
        onSilenceLimit,
        AudioContextCtor = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext),
        setIntervalFn = setInterval,
        clearIntervalFn = clearInterval,
    } = opts;

    let stats = {supported: false, peakRms: 0, voicedMs: 0, elapsedMs: 0};

    if (!stream || !AudioContextCtor) {
        return {stop: () => ({...stats}), getStats: () => ({...stats})};
    }

    let ctx, source, analyser, buffer, timer;
    try {
        ctx = new AudioContextCtor();
        source = ctx.createMediaStreamSource(stream);
        analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        buffer = new Float32Array(analyser.fftSize);
    } catch (e) {
        console.error('Silence watcher init failed:', e);
        return {stop: () => ({...stats}), getStats: () => ({...stats})};
    }

    stats.supported = true;
    let limitFired = false;

    timer = setIntervalFn(() => {
        analyser.getFloatTimeDomainData(buffer);
        let rms = calcRms(buffer);

        stats.elapsedMs += frameMs;
        if (rms > stats.peakRms) {
            stats.peakRms = rms;
        }
        if (rms >= threshold) {
            stats.voicedMs += frameMs;
        }

        if (!limitFired && silenceAutoStopMs && stats.voicedMs < minVoicedMs
            && stats.elapsedMs >= silenceAutoStopMs) {
            limitFired = true;
            onSilenceLimit && onSilenceLimit({...stats});
        }
    }, frameMs);

    function stop() {
        clearIntervalFn(timer);
        try {
            source.disconnect();
            analyser.disconnect();
            ctx.close && ctx.close();
        } catch (e) {
        }
        return {...stats};
    }

    return {stop, getStats: () => ({...stats})};
}
