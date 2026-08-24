import { getScoreRGB, SCORE_COLOR } from './scoreColor';

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
});
