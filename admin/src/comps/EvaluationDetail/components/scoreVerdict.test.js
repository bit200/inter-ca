import { scoreVerdict } from './scoreVerdict';

describe('scoreVerdict: вердикт словом рядом с баллом', () => {
    it('называет ответ по тем же порогам, что и цвет шкалы', () => {
        expect(scoreVerdict(9)).toBe('Отличный ответ');
        expect(scoreVerdict(7)).toBe('Уверенный ответ');
        expect(scoreVerdict(5)).toBe('Есть куда расти');
        expect(scoreVerdict(2)).toBe('Ответ не засчитан');
    });

    it('считает от переданного максимума, а не от десятки', () => {
        expect(scoreVerdict(70, 100)).toBe('Уверенный ответ');
        expect(scoreVerdict(20, 100)).toBe('Ответ не засчитан');
    });

    it('молчит, когда балла нет', () => {
        expect(scoreVerdict(null)).toBe('');
        expect(scoreVerdict(undefined)).toBe('');
    });
});
