import fs from 'fs';
import path from 'path';

// Хэдер админки (.topbar) зафиксирован поверх страницы, поэтому плеер записи
// в разборе диалога должен липнуть под ним, а не к самому краю окна - иначе
// при скролле расшифровки видео уезжает под хэдер.
const scss = fs.readFileSync(path.join(__dirname, 'dialogAnalysis.module.scss'), 'utf8');
const block = (selector) => {
    const start = scss.indexOf(`\n${selector}{`);
    return scss.slice(start, scss.indexOf('\n}', start));
};

describe('липкий плеер записи в разборе диалога', () => {
    test('держится ниже фиксированного хэдера', () => {
        const player = block('.player');
        expect(player).toMatch(/position: sticky;/);
        expect(player).toMatch(/top: calc\(var\(--bs-topbar-height[^;]*\)\s*\+\s*\d+px\);/);
    });

    test('видео по высоте помещается в окно под хэдером', () => {
        expect(block('.player')).toMatch(/max-height: [^;]*100vh - var\(--bs-topbar-height/);
    });
});

describe('открепление плеера записи', () => {
    const jsx = fs.readFileSync(path.join(__dirname, 'DialogAnalysisTab.jsx'), 'utf8');
    const {readPlayerPinned, savePlayerPinned} = require('./dialogMedia');
    const memory = () => {
        const data = {};
        return {getItem: key => (key in data ? data[key] : null), setItem: (key, value) => { data[key] = String(value); }};
    };

    test('откреплённый плеер не липнет и скроллится с лентой', () => {
        expect(block('.player[data-pinned="false"]')).toMatch(/position: static;/);
        expect(jsx).toMatch(/className=\{styles\.player\} data-pinned=\{pinned/);
        expect(jsx).toMatch(/pinned \? 'Открепить' : 'Закрепить'/);
    });

    test('по умолчанию закреплён, выбор запоминается', () => {
        const storage = memory();
        expect(readPlayerPinned(storage)).toBe(true);
        savePlayerPinned(false, storage);
        expect(readPlayerPinned(storage)).toBe(false);
        savePlayerPinned(true, storage);
        expect(readPlayerPinned(storage)).toBe(true);
    });

    test('без доступа к хранилищу остаётся закреплённым', () => {
        const broken = {getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }};
        expect(readPlayerPinned(broken)).toBe(true);
        expect(() => savePlayerPinned(false, broken)).not.toThrow();
    });
});
