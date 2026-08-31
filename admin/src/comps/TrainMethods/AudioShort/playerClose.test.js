import React from 'react';
import { render, act, fireEvent } from '@testing-library/react';
import Player from './Player';

// jsdom не умеет проигрывать звук: подменяем play/pause и следим за паузой.
const mockMedia = () => {
    const pause = jest.fn(function () { Object.defineProperty(this, 'paused', { value: true, configurable: true }); });
    const play = jest.fn(function () {
        Object.defineProperty(this, 'paused', { value: false, configurable: true });
        return Promise.resolve();
    });
    Object.defineProperty(window.HTMLMediaElement.prototype, 'play', { value: play, configurable: true, writable: true });
    Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', { value: pause, configurable: true, writable: true });
    return { play, pause };
};

describe('плеер записи: закрытие', () => {
    let media;

    beforeEach(() => {
        jest.useFakeTimers();
        media = mockMedia();
        global.$ = () => ({ toggleClass: () => {} });
    });

    afterEach(() => {
        jest.useRealTimers();
        delete window.myPlayer;
    });

    const openWithAudio = () => {
        const view = render(<Player/>);
        act(() => { window.myPlayer({ src: 'http://example.com/a.mp3' }); });
        act(() => { fireEvent.canPlay(view.container.querySelector('audio')); });
        act(() => { jest.advanceTimersByTime(1500); });
        expect(media.play).toHaveBeenCalled();
        return view;
    };

    it('крестик останавливает воспроизведение, а не только прячет плеер', () => {
        const { container } = openWithAudio();

        act(() => { fireEvent.click(container.querySelector('.player-close')); });

        expect(media.pause).toHaveBeenCalled();
        expect(container.querySelector('audio').paused).toBe(true);
    });

    it('закрытие через myPlayer({src: ""}) тоже глушит звук', () => {
        const { container } = openWithAudio();

        act(() => { window.myPlayer({ src: '' }); });

        expect(media.pause).toHaveBeenCalled();
        expect(container.querySelector('audio').paused).toBe(true);
    });

    it('отложенный autoplay не стартует, если плеер закрыли до его срабатывания', () => {
        const view = render(<Player/>);
        act(() => { window.myPlayer({ src: 'http://example.com/a.mp3' }); });
        act(() => { fireEvent.canPlay(view.container.querySelector('audio')); });

        act(() => { fireEvent.click(view.container.querySelector('.player-close')); });
        act(() => { jest.advanceTimersByTime(3000); });

        expect(media.play).not.toHaveBeenCalled();
    });
});
