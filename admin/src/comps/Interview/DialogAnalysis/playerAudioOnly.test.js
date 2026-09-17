import fs from 'fs';
import path from 'path';
import {playerView, readPlayerAudioOnly, savePlayerAudioOnly} from './dialogMedia';

const memory = () => {
    const data = {};
    return {getItem: key => (key in data ? data[key] : null), setItem: (key, value) => { data[key] = String(value); }};
};

describe('переключатель «Только аудио» у видео интервью', () => {
    test('видео по переключателю играет как аудиодорожка', () => {
        const video = {kind: 'video', src: '/v.mp4'};
        expect(playerView(video, false)).toBe('video');
        expect(playerView(video, true)).toBe('audio');
        expect(playerView({kind: 'audio', src: '/a.mp3'}, false)).toBe('audio');
        expect(playerView(null, true)).toBe('none');
    });

    test('по умолчанию выключен, выбор запоминается', () => {
        const storage = memory();
        expect(readPlayerAudioOnly(storage)).toBe(false);
        savePlayerAudioOnly(true, storage);
        expect(readPlayerAudioOnly(storage)).toBe(true);
        savePlayerAudioOnly(false, storage);
        expect(readPlayerAudioOnly(storage)).toBe(false);
    });

    test('без доступа к хранилищу показывает видео', () => {
        const broken = {getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }};
        expect(readPlayerAudioOnly(broken)).toBe(false);
        expect(() => savePlayerAudioOnly(true, broken)).not.toThrow();
    });

    test('переключатель стоит только у видео и сделан как switch', () => {
        const jsx = fs.readFileSync(path.join(__dirname, 'DialogAnalysisTab.jsx'), 'utf8');
        expect(jsx).toMatch(/media\.kind === 'video' && <button[^>]*\n?[^]*?role="switch"/);
        expect(jsx).toMatch(/Только аудио/);
    });
});
