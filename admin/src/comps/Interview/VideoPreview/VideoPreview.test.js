import React from 'react';
import {render, screen, fireEvent, act} from '@testing-library/react';
import VideoPreview, {RETRY_DELAY, MAX_RETRIES, retryDelay} from './VideoPreview';
import {readVideoSource} from './videoSource';

beforeEach(() => { global.t = (key) => key; });

describe('ссылка из поля «Видео»', () => {
    test('файл по расширению играет с любого хоста', () => {
        expect(readVideoSource(' https://static.itconsult-web.ru/v/1.mp4 ')).toEqual({kind: 'direct', src: 'https://static.itconsult-web.ru/v/1.mp4'});
        expect(readVideoSource('https://drive.google.com/x/call.webm').kind).toBe('direct');
    });

    test('страница хостинга - не файл', () => {
        expect(readVideoSource('https://drive.google.com/file/d/1aI/view?usp=drive_link'))
            .toEqual({kind: 'page', src: 'https://drive.google.com/file/d/1aI/view?usp=drive_link', place: 'на Google Диске'});
        expect(readVideoSource('https://youtu.be/abc').kind).toBe('page');
        expect(readVideoSource('https://disk.yandex.ru/i/abc').kind).toBe('page');
    });

    test('пустое значение - нет видео', () => {
        expect(readVideoSource('')).toBeNull();
        expect(readVideoSource(undefined)).toBeNull();
    });
});

describe('превью записи интервью', () => {
    test('ссылка на Google Диск: вместо чёрного плеера плашка со ссылкой', () => {
        const drive = 'https://drive.google.com/file/d/1aI/view?usp=drive_link';
        const {container} = render(<VideoPreview src={drive} time={{}}/>);
        expect(container.querySelector('video')).toBeNull();
        expect(screen.getByText('Запись нельзя посмотреть здесь')).toBeInTheDocument();
        const link = screen.getByRole('link', {name: 'Открыть на Google Диске'});
        expect(link).toHaveAttribute('href', drive);
        expect(link).toHaveAttribute('target', '_blank');
    });

    test('ссылку не глушит обёртка карточки, которая на всплытии зовёт preventDefault', () => {
        const drive = 'https://drive.google.com/file/d/1aI/view?usp=drive_link';
        render(<div onClick={e => e.preventDefault()}><VideoPreview src={drive} time={{}}/></div>);
        const link = screen.getByRole('link', {name: 'Открыть на Google Диске'});
        const click = new MouseEvent('click', {bubbles: true, cancelable: true});
        link.dispatchEvent(click);
        expect(click.defaultPrevented).toBe(false);
    });

    test('первая ошибка: лоадер вместо ошибки, затем плеер снова', () => {
        jest.useFakeTimers();
        const {container} = render(<VideoPreview src="https://x.test/stream" time={{}}/>);
        fireEvent.error(container.querySelector('video'));
        expect(container.querySelector('video')).toBeNull();
        expect(screen.queryByText('Видео не загрузилось')).toBeNull();
        expect(screen.getByRole('status')).toBeInTheDocument();
        act(() => { jest.advanceTimersByTime(RETRY_DELAY); });
        expect(container.querySelector('video')).not.toBeNull();
        jest.useRealTimers();
    });

    test('пауза между попытками растёт: 2с, 4с, 8с', () => {
        jest.useFakeTimers();
        const {container} = render(<VideoPreview src="https://x.test/stream" time={{}}/>);
        [2000, 4000, 8000].forEach(ms => {
            fireEvent.error(container.querySelector('video'));
            act(() => { jest.advanceTimersByTime(ms - 1); });
            expect(container.querySelector('video')).toBeNull();
            act(() => { jest.advanceTimersByTime(1); });
            expect(container.querySelector('video')).not.toBeNull();
        });
        jest.useRealTimers();
    });

    test('файл так и не появился: после всех попыток плеер заменяется плашкой', () => {
        jest.useFakeTimers();
        const {container} = render(<VideoPreview src="https://x.test/stream" time={{}}/>);
        for (let i = 0; i < MAX_RETRIES; i++) {
            fireEvent.error(container.querySelector('video'));
            act(() => { jest.advanceTimersByTime(retryDelay(i)); });
        }
        const video = container.querySelector('video');
        expect(video).toHaveAttribute('src', 'https://x.test/stream');
        fireEvent.error(video);
        expect(container.querySelector('video')).toBeNull();
        expect(screen.getByText('Видео не загрузилось')).toBeInTheDocument();
        expect(screen.getByRole('link', {name: 'Открыть ссылку'})).toHaveAttribute('href', 'https://x.test/stream');
        jest.useRealTimers();
    });

    test('без ссылки - «Видео не загружено»', () => {
        const {container} = render(<VideoPreview src="" time={{}}/>);
        expect(container.querySelector('video')).toBeNull();
        expect(screen.getByText('videoNotUploaded')).toBeInTheDocument();
    });
});
