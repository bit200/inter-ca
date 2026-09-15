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

describe('липкий плеер записи на узком экране', () => {
    const narrow = (() => {
        const start = scss.indexOf('@media (max-width: 991px){');
        return start < 0 ? '' : scss.slice(start, scss.indexOf('\n}', start));
    })();

    test('прижат к сжатой при скролле шапке, без зазора', () => {
        const top = narrow.match(/\.player\{[^]*?top: calc\(var\(--bs-topbar-height[^)]*\) - 20px \+ (\d+)px\);/);
        expect(top).not.toBeNull();
        expect(Number(top[1])).toBeLessThanOrEqual(6);
    });

    test('видео ниже, чем на широком экране', () => {
        const vh = (css) => Number((css.match(/video\{[^}]*max-height: min\((\d+)vh/) || [])[1]);
        expect(vh(narrow)).toBeLessThan(vh(block('.player')));
    });
});
