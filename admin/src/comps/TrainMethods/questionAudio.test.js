import {playQuestionAudio, questionSpeechText, requestQuestionAudioUrl, stopQuestionAudio} from './questionAudio';

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
