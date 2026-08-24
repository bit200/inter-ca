import { formatScore } from './formatScore';

describe('formatScore', () => {
    it('обрезает длинный хвост дроби до двух знаков', () => {
        expect(formatScore(0.7777777777777778)).toBe('0.78');
        expect(formatScore(0.3333333333333333)).toBe('0.33');
    });

    it('не дописывает нули целым и коротким числам', () => {
        expect(formatScore(1)).toBe('1');
        expect(formatScore(0)).toBe('0');
        expect(formatScore(0.3)).toBe('0.3');
        expect(formatScore(8.5)).toBe('8.5');
    });

    it('принимает число строкой', () => {
        expect(formatScore('0.7777777777777778')).toBe('0.78');
    });

    it('на пустом значении отдаёт пустую строку, нечисловое оставляет как есть', () => {
        expect(formatScore(null)).toBe('');
        expect(formatScore(undefined)).toBe('');
        expect(formatScore('n/a')).toBe('n/a');
    });
});
