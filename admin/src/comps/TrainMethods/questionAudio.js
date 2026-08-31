// Озвучка вопроса кандидату.
//
// Раньше вопрос читал робот браузера (speechSynthesis) - звучало плохо, и от
// него отказались совсем. Теперь бэкенд заранее генерирует WAV голосом-образцом
// через адаптер audio.tts_generate.v1, кладёт файл в закрытый бакет S3 и по
// запросу отдаёт короткоживущий presigned URL.
//
// Спрашиваем озвучку ПО ID КВИЗА: GET /api/question-audio/quiz/:id. Бэкенд сам
// собирает текст из полей квиза - ровно так же, как при генерации файла и в
// карточке вопроса админки. Пока фронт спрашивал по тексту с экрана, на
// озвученный вопрос приходило {reason: 'missing'}: кандидату показывается не то
// же поле, из которого озвучка генерилась (audioName/name/specialTitle/
// specialName, часть которых сервер вообще не отдаёт в карточке вопроса), и
// хэш не сходился.
//
// Запрос по тексту остаётся страховкой на случай, когда id квиза до плеера не
// доехал (старые экраны, ручной вызов textToVoice).
//
// Готового файла может не быть (новый или только что отредактированный вопрос,
// выключенная на сервере озвучка) - тогда вопрос просто не озвучивается.

// Текст, по которому спрашивается озвучка, когда id квиза неизвестен. Подсказку
// под вопросом (smallTitle) в запрос не добавляем: бэкенд озвучивает текст
// самого вопроса, с подсказкой хэш не сойдётся.
export function questionSpeechText(info) {
    let {title} = info || {};
    return String(title || '').trim();
}

let currentAudio = null;

// ВРЕМЕННО (отладка задачи про {reason: 'missing'}): подробный лог всего пути
// озвучки - какой текст ушёл на бэкенд, что он ответил, что случилось с файлом.
// Когда причина найдётся, логи и кнопку "Озвучить вопрос" из AudioShort убрать.
const LOG_PREFIX = '[question-audio]';

export function questionAudioLog(...args) {
    try {
        console.log(LOG_PREFIX, ...args);
    } catch (e) {
    }
}

// Последний ответ бэкенда - чтобы отладочная кнопка могла показать причину
// прямо на экране, не заставляя человека открывать консоль.
let lastProbe = null;

export function getLastQuestionAudioProbe() {
    return lastProbe;
}

// Останавливает проигрывание готового файла - зовётся из stopAnyPlay, чтобы
// предыдущий вопрос не звучал поверх нового.
export function stopQuestionAudio() {
    let audio = currentAudio;
    if (!audio) {
        return;
    }
    questionAudioLog('останавливаю проигрывание');
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
export function requestQuestionAudioUrl(params, http) {
    let {text, quizId} = typeof params === 'string' ? {text: params} : (params || {});
    http = http || global.http;
    if (!http || (!http.post && !http.get)) {
        lastProbe = {ok: false, reason: 'no-http', text: text || '', quizId: quizId || null};
        questionAudioLog('запрос не отправлен', lastProbe);
        return Promise.resolve(null);
    }

    // По id квиза - основной путь: бэкенд знает, из какого поля озвучен вопрос.
    if (quizId && http.get) {
        questionAudioLog('запрашиваю ссылку по квизу', {quizId});
        return http.get('/question-audio/quiz/' + quizId, {}, {wo_notify: true})
            .then(r => {
                lastProbe = {ok: !!(r && r.url), reason: (r && r.reason) || null, quizId, text: text || '', answer: r || null};
                questionAudioLog('ответ бэкенда по квизу', lastProbe);
                if (r && r.url) {
                    return r;
                }
                return requestAudioUrlByText(text, http);
            })
            .catch(e => {
                lastProbe = {ok: false, reason: 'request-failed', quizId, text: text || '', error: (e && e.message) || String(e)};
                questionAudioLog('запрос по квизу упал', lastProbe);
                return requestAudioUrlByText(text, http);
            });
    }

    return requestAudioUrlByText(text, http);
}

// Страховка: озвучка по тексту вопроса, когда id квиза неизвестен.
function requestAudioUrlByText(text, http) {
    if (!text || !http || !http.post) {
        lastProbe = {ok: false, reason: !text ? 'empty-text' : 'no-http', text: text || '', answer: (lastProbe || {}).answer || null};
        questionAudioLog('запрос по тексту не отправлен', lastProbe);
        return Promise.resolve(null);
    }

    questionAudioLog('запрашиваю ссылку по тексту', {text, length: text.length});

    return http.post('/question-audio/url', {text}, {wo_notify: true})
        .then(r => {
            lastProbe = {ok: !!(r && r.url), reason: (r && r.reason) || null, text, answer: r || null};
            questionAudioLog('ответ бэкенда', lastProbe);
            return (r && r.url ? r : null);
        })
        .catch(e => {
            lastProbe = {ok: false, reason: 'request-failed', text, error: (e && e.message) || String(e)};
            questionAudioLog('запрос упал', lastProbe);
            return null;
        });
}

// Проигрывает готовую озвучку вопроса.
// onEnd - файл доиграл до конца, onFallback - файла нет либо он не проигрался
// (озвучки не будет, сценарий двигает страховочный таймаут вызывающего).
// Возвращает промис с {durationSec} при удачном старте и null иначе.
export function playQuestionAudio(params, opts) {
    let {text, quizId} = params || {};
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

    return requestQuestionAudioUrl({text, quizId}, http).then(info => {
        if (!info || !AudioCtor) {
            questionAudioLog('озвучки не будет', {hasInfo: !!info, hasAudioCtor: !!AudioCtor});
            return finish(onFallback)(), null;
        }

        stopQuestionAudio();
        try {
            audio = new AudioCtor(info.url);
        } catch (e) {
            questionAudioLog('Audio не создался', {error: (e && e.message) || String(e)});
            return finish(onFallback)(), null;
        }
        currentAudio = audio;
        audio.onended = () => {
            questionAudioLog('файл доиграл до конца');
            finish(onEnd)();
        };
        audio.onerror = () => {
            questionAudioLog('ошибка проигрывания файла', {url: info.url});
            finish(onFallback)();
        };

        try {
            questionAudioLog('играю файл', {url: info.url, durationSec: info.durationSec || null});
            let played = audio.play();
            if (played && played.catch) {
                played.catch(e => {
                    questionAudioLog('play() отклонён браузером', {error: (e && e.message) || String(e)});
                    finish(onFallback)();
                });
            }
        } catch (e) {
            questionAudioLog('play() бросил ошибку', {error: (e && e.message) || String(e)});
            finish(onFallback)();
            return null;
        }

        return {durationSec: info.durationSec || null};
    });
}
