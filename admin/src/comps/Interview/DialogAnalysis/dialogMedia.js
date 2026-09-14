// Запись, к которой привязаны реплики разбора. Тайм-коды реплик считаются от
// начала той же записи, из которой разбор доставал звук, поэтому клик по
// реплике просто перематывает плеер. Видео важнее: на нём видно собеседника.
// Звук берём, только если видео нет, а отдельная аудиозапись есть.

function firstUrl(values) {
    for (let value of values) {
        if (typeof value === 'string' && value.trim()) return value.trim();
        if (value && typeof value === 'object' && typeof value.url === 'string' && value.url.trim()) {
            return value.url.trim();
        }
    }
    return '';
}

export function pickDialogMedia(interview, analysis) {
    let item = interview && typeof interview === 'object' ? interview : {};
    let state = analysis && typeof analysis === 'object' ? analysis : {};
    let result = state.result && typeof state.result === 'object' ? state.result : {};
    let media = result.media && typeof result.media === 'object' ? result.media : {};

    let video = firstUrl([item.video, item.uploadVideo, media.videoUrl, media.video]);
    if (video) return {kind: 'video', src: video};

    let audio = firstUrl([
        item.audio, item.audioUrl, item.uploadAudio,
        state.audioUrl, result.audioUrl, result.audio, media.audioUrl, media.audio,
    ]);
    if (audio) return {kind: 'audio', src: audio};

    return null;
}

// Реплика, которая звучит в момент ms. Конец реплики может не прийти -
// тогда она длится до начала следующей. Паузы между репликами ничего не подсвечивают.
export function turnIndexAt(turns, ms) {
    let list = Array.isArray(turns) ? turns : [];
    let time = Number(ms);
    if (!Number.isFinite(time)) return -1;
    for (let i = 0; i < list.length; i++) {
        let turn = list[i] || {};
        let start = Number(turn.startMs);
        if (!Number.isFinite(start) || time < start) continue;
        let next = list[i + 1] && Number(list[i + 1].startMs);
        let end = Number.isFinite(Number(turn.endMs)) && Number(turn.endMs) > start
            ? Number(turn.endMs)
            : Number.isFinite(next) ? next : Infinity;
        if (time < end) return i;
    }
    return -1;
}
