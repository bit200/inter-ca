import { getScoreRGB, getScoreTextColor, SCORE_COLOR, SCORE_TEXT_COLOR } from './scoreColor';

describe('getScoreRGB', () => {
    it('во всём диапазоне даёт только три цвета шкалы', () => {
        const used = new Set();
        for (let pct = 0; pct <= 100; pct++) used.add(getScoreRGB(pct, 100));

        expect([...used].sort()).toEqual([SCORE_COLOR.bad, SCORE_COLOR.mid, SCORE_COLOR.good].sort());
    });

    it('красит по порогам: <40% красный, <70% оранжевый, дальше зелёный', () => {
        expect(getScoreRGB(0, 100)).toBe(SCORE_COLOR.bad);
        expect(getScoreRGB(39, 100)).toBe(SCORE_COLOR.bad);
        expect(getScoreRGB(40, 100)).toBe(SCORE_COLOR.mid);
        expect(getScoreRGB(69, 100)).toBe(SCORE_COLOR.mid);
        expect(getScoreRGB(70, 100)).toBe(SCORE_COLOR.good);
        expect(getScoreRGB(100, 100)).toBe(SCORE_COLOR.good);
    });

    it('работает с десятибалльной шкалой и не выходит за края', () => {
        expect(getScoreRGB(5.7, 10)).toBe(SCORE_COLOR.mid);
        expect(getScoreRGB(-3, 10)).toBe(SCORE_COLOR.bad);
        expect(getScoreRGB(42, 10)).toBe(SCORE_COLOR.good);
    });
});

describe('палитра оценки', () => {
    it('берёт цвета из css-переменных, а не хардкодит rgb', () => {
        expect(Object.values(SCORE_COLOR)).toEqual([
            'var(--score-bad)', 'var(--score-mid)', 'var(--score-good)',
        ]);
    });

    it('эти переменные объявлены в общей палитре проекта', () => {
        const fs = require('fs');
        const path = require('path');
        const colors = fs.readFileSync(path.join(__dirname, '../../../scss/colors.scss'), 'utf8');

        for (const name of ['--score-bad', '--score-mid', '--score-good']) {
            expect(colors).toContain(`${name}:`);
            expect(colors).toContain(`${name}-rgb:`);
        }
    });

    // Цвета шкалы стоят рядом в одной строке чипов, поэтому чистые сигнальные
    // тона (красный 230,25,25 и салатовый 28,190,28) рябили и спорили с
    // серо-синими нейтралями страницы. Держим палитру приглушённой.
    it('держит приглушённые тона: без чистых сигнальных цветов', () => {
        const fs = require('fs');
        const path = require('path');
        const colors = fs.readFileSync(path.join(__dirname, '../../../scss/colors.scss'), 'utf8');

        for (const name of ['--score-bad', '--score-mid', '--score-good']) {
            const m = new RegExp(`${name}-rgb:\\s*(\\d+),\\s*(\\d+),\\s*(\\d+)`).exec(colors);
            expect(m).toBeTruthy();

            const rgb = m.slice(1).map(Number);
            // Ни один канал не выкручен в максимум - иначе цвет светится.
            expect(Math.max(...rgb)).toBeLessThanOrEqual(200);
            // Разброс каналов - мера насыщенности: чем он меньше, тем спокойнее цвет.
            expect(Math.max(...rgb) - Math.min(...rgb)).toBeLessThanOrEqual(140);
        }
    });
});

// Цифру в чипе красили тем же насыщенным тоном, что и деления шкалы, и на
// светлой подложке она читалась хуже собственной подписи. У шкалы два набора
// тонов: насыщенный для заливок и тёмный для текста.
describe('текстовые тона шкалы', () => {
    const fs = require('fs');
    const path = require('path');
    const colors = fs.readFileSync(path.join(__dirname, '../../../scss/colors.scss'), 'utf8');

    const hex = (name, scope) => {
        const block = scope === 'dark'
            ? colors.slice(colors.indexOf('html[data-bs-theme=dark]'))
            : colors.slice(0, colors.indexOf('html[data-bs-theme=dark]'));
        const m = new RegExp(`${name}:\\s*#([0-9a-fA-F]{6})`).exec(block);
        expect(m).toBeTruthy();

        return m[1].match(/../g).map(c => parseInt(c, 16));
    };

    const luminance = (rgb) => {
        const [r, g, b] = rgb.map(v => {
            const c = v / 255;
            return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        });

        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    const contrast = (a, b) => {
        const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);

        return (hi + 0.05) / (lo + 0.05);
    };

    it('красит текст по тем же порогам, что и деления', () => {
        expect(getScoreTextColor(0, 100)).toBe(SCORE_TEXT_COLOR.bad);
        expect(getScoreTextColor(39, 100)).toBe(SCORE_TEXT_COLOR.bad);
        expect(getScoreTextColor(40, 100)).toBe(SCORE_TEXT_COLOR.mid);
        expect(getScoreTextColor(69, 100)).toBe(SCORE_TEXT_COLOR.mid);
        expect(getScoreTextColor(70, 100)).toBe(SCORE_TEXT_COLOR.good);
        expect(getScoreTextColor(5.7, 10)).toBe(SCORE_TEXT_COLOR.mid);
    });

    it('берёт их из отдельных css-переменных, а не из тонов заливки', () => {
        expect(Object.values(SCORE_TEXT_COLOR)).toEqual([
            'var(--score-bad-text)', 'var(--score-mid-text)', 'var(--score-good-text)',
        ]);
        expect(Object.values(SCORE_TEXT_COLOR)).not.toEqual(Object.values(SCORE_COLOR));
    });

    // Подложки чипов линейки: белая у общей оценки и мягкая #f1f4f9 у остальных.
    it('на светлых подложках чипа даёт контраст не ниже AA (4.5:1)', () => {
        for (const name of ['--score-bad-text', '--score-mid-text', '--score-good-text']) {
            for (const bg of [[255, 255, 255], [241, 244, 249]]) {
                expect(contrast(hex(name, 'light'), bg)).toBeGreaterThanOrEqual(4.5);
            }
        }
    });

    it('на тёмной теме тоже держит AA', () => {
        for (const name of ['--score-bad-text', '--score-mid-text', '--score-good-text']) {
            for (const bg of [[32, 34, 33], [37, 40, 45]]) {
                expect(contrast(hex(name, 'dark'), bg)).toBeGreaterThanOrEqual(4.5);
            }
        }
    });
});
