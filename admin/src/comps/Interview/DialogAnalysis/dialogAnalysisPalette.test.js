import fs from 'fs';
import path from 'path';

// Вкладка разбора диалога живёт на странице с зелёной темой проекта
// (--bs-primary #22c55e), поэтому её собственные токены не должны уводить
// оформление в синий. Проверяем палитру из стилей: ни один токен - включая
// текст, линии и тени - не отдаёт синим, даже едва заметным холодным серым.
const scss = fs.readFileSync(path.join(__dirname, 'dialogAnalysis.module.scss'), 'utf8');

function hsl(color) {
    const rgb = color.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/i);
    const [r, g, b] = rgb
        ? rgb.slice(1, 4).map(v => +v / 255)
        : [0, 2, 4].map(i => parseInt(color.replace('#', '').slice(i, i + 2), 16) / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
    if (max === min) return { h: 0, s: 0 };
    const d = max - min;
    const s = d / (1 - Math.abs(2 * l - 1));
    let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return { h: (h * 60 + 360) % 360, s };
}

function tokens(block) {
    return [...block.matchAll(/--(dlg-[\w-]+):\s*(#[0-9a-f]{6})/gi)]
        .map(([, name, hex]) => ({ name, hex }));
}

// Синий или холодный сине-серый: оттенок в синей зоне при заметной насыщенности.
const isBlue = color => {
    const { h, s } = hsl(color);
    return h >= 190 && h <= 260 && s > 0.05;
};

describe('палитра разбора диалога', () => {
    const light = scss.slice(scss.indexOf('.tab{'), scss.indexOf('}', scss.indexOf('.tab{')));
    const darkStart = scss.indexOf(':global(html[data-bs-theme="dark"]) .tab{');
    const dark = scss.slice(darkStart, scss.indexOf('}', darkStart));

    it.each([['светлая', light], ['тёмная', dark]])('%s тема без синих токенов', (_, block) => {
        expect(tokens(block).filter(({ hex }) => isBlue(hex))).toEqual([]);
    });

    it('модалки разбора вне вкладки получают те же токены в обеих темах', () => {
        expect(scss).toMatch(/\n\.palette,\n\.tab\{/);
        expect(scss).toContain(':global(html[data-bs-theme="dark"]) .palette,\n:global(html[data-bs-theme="dark"]) .tab{');
    });

    it('тени и прочие цвета вне токенов не синие', () => {
        const colors = scss.match(/rgba?\([^)]*\)|#[0-9a-f]{6}\b/gi) || [];
        expect(colors.filter(isBlue)).toEqual([]);
    });

    it('акцент - зелёный', () => {
        const accent = tokens(light).find(t => t.name === 'dlg-accent');
        const { h } = hsl(accent.hex);
        expect(h).toBeGreaterThan(90);
        expect(h).toBeLessThan(170);
    });

    it('звучащая реплика и роль интервьюера берут зелёный акцент', () => {
        expect(scss).toMatch(/\.turn\[data-playing="true"\]\{ background: var\(--dlg-accent-soft\); \}/);
        expect(light).toMatch(/--dlg-host: var\(--dlg-accent\)/);
    });
});
