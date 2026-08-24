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
