// Озвучка вопроса кандидату.
//
// Раньше вопрос читал робот браузера (speechSynthesis) - звучало плохо, и от
// него отказались совсем. Теперь бэкенд заранее генерирует WAV голосом-образцом
// через адаптер audio.tts_generate.v1, кладёт файл в закрытый бакет S3 и по
// запросу отдаёт короткоживущий presigned URL: POST /api/question-audio/url {text}.
//
// Готового файла может не быть (новый или только что отредактированный вопрос,
// выключенная на сервере озвучка) - тогда вопрос просто не озвучивается.

let currentAudio = null;

// Останавливает проигрывание готового файла - зовётся из stopAnyPlay, чтобы
// предыдущий вопрос не звучал поверх нового.
export function stopQuestionAudio() {
    let audio = currentAudio;
    if (!audio) {
        return;
    }
    currentAudio = null;
    try {
        audio.pause();
        audio.currentTime = 0;
    } catch (e) {
    }
}

// null значит "готового файла нет" - в том числе когда сервер ответил
// {reason: 'missing'} или запрос не удался. Ошибку не показываем кандидату:
// для него это не сбой, вопрос виден на экране.
export function requestQuestionAudioUrl(text, http) {
    http = http || global.http;
    if (!text || !http || !http.post) {
        return Promise.resolve(null);
    }

    return http.post('/question-audio/url', {text}, {wo_notify: true})
        .then(r => (r && r.url ? r : null))
        .catch(() => null);
}

// Проигрывает готовую озвучку вопроса.
// onEnd - файл доиграл до конца, onFallback - файла нет либо он не проигрался
// (озвучки не будет, сценарий двигает страховочный таймаут вызывающего).
// Возвращает промис с {durationSec} при удачном старте и null иначе.
export function playQuestionAudio(params, opts) {
    let {text} = params || {};
    let {onEnd, onFallback, http, AudioCtor} = opts || {};
    AudioCtor = AudioCtor || (typeof window !== 'undefined' ? window.Audio : null);

    let settled = false;
    let finish = (cb) => () => {
        if (settled) {
            return;
        }
        settled = true;
        if (currentAudio === audio) {
            currentAudio = null;
        }
        cb && cb();
    };
    let audio = null;

    return requestQuestionAudioUrl(text, http).then(info => {
        if (!info || !AudioCtor) {
            return finish(onFallback)(), null;
        }

        stopQuestionAudio();
        try {
            audio = new AudioCtor(info.url);
        } catch (e) {
            return finish(onFallback)(), null;
        }
        currentAudio = audio;
        audio.onended = finish(onEnd);
        audio.onerror = finish(onFallback);

        try {
            let played = audio.play();
            if (played && played.catch) {
                played.catch(finish(onFallback));
            }
        } catch (e) {
            finish(onFallback)();
            return null;
        }

        return {durationSec: info.durationSec || null};
    });
}
