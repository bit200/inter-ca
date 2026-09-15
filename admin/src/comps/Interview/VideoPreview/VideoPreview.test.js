import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import VideoPreview from './VideoPreview';
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

    test('файл не загрузился: плеер заменяется плашкой', () => {
        const {container} = render(<VideoPreview src="https://x.test/stream" time={{}}/>);
        const video = container.querySelector('video');
        expect(video).toHaveAttribute('src', 'https://x.test/stream');
        fireEvent.error(video);
        expect(container.querySelector('video')).toBeNull();
        expect(screen.getByText('Видео не загрузилось')).toBeInTheDocument();
        expect(screen.getByRole('link', {name: 'Открыть ссылку'})).toHaveAttribute('href', 'https://x.test/stream');
    });

    test('без ссылки - «Видео не загружено»', () => {
        const {container} = render(<VideoPreview src="" time={{}}/>);
        expect(container.querySelector('video')).toBeNull();
        expect(screen.getByText('videoNotUploaded')).toBeInTheDocument();
    });
});
