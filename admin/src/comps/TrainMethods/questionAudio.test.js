import {
    playQuestionAudio,
    questionSpeechText,
    requestQuestionAudioUrl,
    stopQuestionAudio,
    getLastQuestionAudioProbe,
} from './questionAudio';

class FakeAudio {
    constructor(src) {
        this.src = src;
        FakeAudio.last = this;
        this.paused = false;
    }

    play() {
        this.played = true;
        return Promise.resolve();
    }

    pause() {
        this.paused = true;
    }
}

describe('озвучка вопроса готовым файлом', () => {
    afterEach(() => {
        stopQuestionAudio();
        delete global.http;
    });

    it('берёт presigned url у бэкенда и играет файл', async () => {
        const post = jest.fn(() => Promise.resolve({url: 'https://s3/q.wav?sig=1', durationSec: 12}));
        global.http = {post};
        const onEnd = jest.fn();
        const onFallback = jest.fn();

        const played = await playQuestionAudio({text: 'Расскажите о себе'}, {onEnd, onFallback, AudioCtor: FakeAudio});

        expect(post).toHaveBeenCalledWith('/question-audio/url', {text: 'Расскажите о себе'}, {wo_notify: true});
        expect(FakeAudio.last.src).toBe('https://s3/q.wav?sig=1');
        expect(FakeAudio.last.played).toBe(true);
        expect(played).toEqual({durationSec: 12});
        expect(onFallback).not.toHaveBeenCalled();

        FakeAudio.last.onended();
        expect(onEnd).toHaveBeenCalled();
    });

    it('без готового аудио сообщает, что озвучки не будет', async () => {
        global.http = {post: () => Promise.resolve({reason: 'missing'})};
        const onFallback = jest.fn();

        const played = await playQuestionAudio({text: 'Что такое замыкание?'}, {onFallback, AudioCtor: FakeAudio});

        expect(played).toBe(null);
        expect(onFallback).toHaveBeenCalledTimes(1);
    });

    it('упавший запрос за ссылкой не ломает сценарий', async () => {
        global.http = {post: () => Promise.reject(new Error('boom'))};

        await expect(requestQuestionAudioUrl('текст')).resolves.toBe(null);
    });

    it('stopQuestionAudio останавливает текущий файл', async () => {
        global.http = {post: () => Promise.resolve({url: 'https://s3/q.wav'})};

        await playQuestionAudio({text: 'вопрос'}, {AudioCtor: FakeAudio});
        stopQuestionAudio();

        expect(FakeAudio.last.paused).toBe(true);
    });

    it('ошибка проигрывания сообщается один раз', async () => {
        global.http = {post: () => Promise.resolve({url: 'https://s3/q.wav'})};
        const onFallback = jest.fn();

        await playQuestionAudio({text: 'вопрос'}, {onFallback, AudioCtor: FakeAudio});
        FakeAudio.last.onerror();
        FakeAudio.last.onerror();

        expect(onFallback).toHaveBeenCalledTimes(1);
    });
});

// Бэкенд озвучивает текст самого вопроса, поэтому спрашивать озвучку надо
// ровно по нему: с приклеенной подсказкой под вопросом хэш не сходится и на
// озвученный вопрос приходит {reason: 'missing'}.
describe('текст запроса озвучки', () => {
    it('не добавляет к вопросу подсказку под ним', () => {
        let text = questionSpeechText({
            title: 'Что выведет в консоль, почему?',
            smallTitle: 'Расскажите возможные алгоритмы решения, подводные камни, плюсы и минусы',
        });

        expect(text).toBe('Что выведет в консоль, почему?');
    });

    it('без вопроса отдаёт пустую строку', () => {
        expect(questionSpeechText({smallTitle: 'Раскройте вопрос'})).toBe('');
        expect(questionSpeechText()).toBe('');
    });
});


// Временная отладка: на озвученном вопросе приходит {reason: 'missing'}, и на
// боевом стенде это не воспроизводится. Путь озвучки пишет лог с префиксом
// [question-audio], а последний ответ бэкенда доступен отладочной кнопке.
describe('отладочные логи озвучки', () => {
    let log;

    beforeEach(() => {
        log = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        log.mockRestore();
        delete global.http;
    });

    it('пишет в консоль текст запроса и ответ бэкенда', async () => {
        global.http = {post: () => Promise.resolve({reason: 'missing'})};

        await requestQuestionAudioUrl('Что такое замыкание?');

        let lines = log.mock.calls.filter(args => args[0] === '[question-audio]');
        expect(lines.length).toBeGreaterThanOrEqual(2);
        expect(JSON.stringify(lines)).toContain('Что такое замыкание?');
        expect(JSON.stringify(lines)).toContain('missing');
    });

    it('запоминает причину отказа для отладочной кнопки', async () => {
        global.http = {post: () => Promise.resolve({reason: 'missing'})};

        await requestQuestionAudioUrl('вопрос');

        expect(getLastQuestionAudioProbe()).toMatchObject({ok: false, reason: 'missing', text: 'вопрос'});
    });

    it('упавший запрос тоже попадает в отладку', async () => {
        global.http = {post: () => Promise.reject(new Error('boom'))};

        await requestQuestionAudioUrl('вопрос');

        expect(getLastQuestionAudioProbe()).toMatchObject({ok: false, reason: 'request-failed'});
    });
});

// Кандидату показывается не то же поле вопроса, из которого сгенерирован файл,
// поэтому по тексту с экрана на озвученный вопрос приходило {reason: 'missing'}.
// Озвучку спрашиваем по id квиза - текст собирает сам бэкенд.
describe('озвучка по id квиза', () => {
    afterEach(() => {
        stopQuestionAudio();
        delete global.http;
    });

    it('спрашивает озвучку по квизу, а не по тексту с экрана', async () => {
        const get = jest.fn(() => Promise.resolve({url: 'https://s3/q.wav?sig=2', durationSec: 7}));
        const post = jest.fn(() => Promise.resolve({reason: 'missing'}));
        global.http = {get, post};

        const played = await playQuestionAudio({text: 'Осветите тему', quizId: 2814}, {AudioCtor: FakeAudio});

        expect(get).toHaveBeenCalledWith('/question-audio/quiz/2814', {}, {wo_notify: true});
        expect(post).not.toHaveBeenCalled();
        expect(FakeAudio.last.src).toBe('https://s3/q.wav?sig=2');
        expect(played).toEqual({durationSec: 7});
    });

    it('без озвучки по квизу пробует по тексту', async () => {
        const get = jest.fn(() => Promise.resolve({reason: 'missing'}));
        const post = jest.fn(() => Promise.resolve({url: 'https://s3/by-text.wav'}));
        global.http = {get, post};

        const info = await requestQuestionAudioUrl({text: 'Что такое замыкание?', quizId: 77});

        expect(post).toHaveBeenCalledWith('/question-audio/url', {text: 'Что такое замыкание?'}, {wo_notify: true});
        expect(info.url).toBe('https://s3/by-text.wav');
    });

    it('упавший запрос по квизу не ломает сценарий', async () => {
        global.http = {get: () => Promise.reject(new Error('boom')), post: () => Promise.resolve({reason: 'missing'})};

        await expect(requestQuestionAudioUrl({text: 'вопрос', quizId: 5})).resolves.toBe(null);
    });
});
