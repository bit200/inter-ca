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
