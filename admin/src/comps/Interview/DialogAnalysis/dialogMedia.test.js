import {pickDialogMedia, turnIndexAt} from './dialogMedia';

describe('запись для реплик разбора', () => {
    test('видео важнее аудио', () => {
        expect(pickDialogMedia({video: 'https://x/v.mp4', audio: 'https://x/a.mp3'}, {}))
            .toEqual({kind: 'video', src: 'https://x/v.mp4'});
    });

    test('без видео берём аудиозапись интервью или разбора', () => {
        expect(pickDialogMedia({audio: 'https://x/a.mp3'}, {})).toEqual({kind: 'audio', src: 'https://x/a.mp3'});
        expect(pickDialogMedia({}, {result: {media: {audioUrl: 'https://x/b.webm'}}}))
            .toEqual({kind: 'audio', src: 'https://x/b.webm'});
    });

    test('ссылку на страницу Google Диска не ставим в плеер', () => {
        const drive = 'https://drive.google.com/file/d/1aI/view?usp=drive_link';
        expect(pickDialogMedia({video: drive}, {})).toBeNull();
        expect(pickDialogMedia({video: drive, audio: 'https://x/a.mp3'}, {}))
            .toEqual({kind: 'audio', src: 'https://x/a.mp3'});
        expect(pickDialogMedia({video: drive}, {result: {media: {videoUrl: 'https://x/v.webm'}}}))
            .toEqual({kind: 'video', src: 'https://x/v.webm'});
    });

    test('без записи плеера нет', () => {
        expect(pickDialogMedia({video: '  '}, null)).toBeNull();
    });
});

describe('реплика в текущий момент записи', () => {
    const turns = [
        {startMs: 0, endMs: 4000},
        {startMs: 5000},
        {startMs: 9000, endMs: 12000},
    ];

    test('попадание внутрь реплики', () => {
        expect(turnIndexAt(turns, 1000)).toBe(0);
        expect(turnIndexAt(turns, 11999)).toBe(2);
    });

    test('реплика без конца длится до следующей, в паузе ничего', () => {
        expect(turnIndexAt(turns, 8000)).toBe(1);
        expect(turnIndexAt(turns, 4500)).toBe(-1);
        expect(turnIndexAt(turns, 13000)).toBe(-1);
    });
});
