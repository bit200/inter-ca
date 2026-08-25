import { filledSegments, SEGMENTS } from './scoreSegments';

describe('filledSegments: деления в чипе показателя', () => {
    it('делит шкалу на пять равных ступеней', () => {
        expect(filledSegments(100)).toBe(SEGMENTS);
        expect(filledSegments(82)).toBe(4);
        expect(filledSegments(58)).toBe(3);
        expect(filledSegments(30)).toBe(2);
    });

    it('меряет общую оценку той же шкалой, что и проценты показателей', () => {
        // 7 из 10 и 70% - одно и то же качество ответа, значит и делений поровну.
        expect(filledSegments(7, 10)).toBe(filledSegments(70, 100));
    });

    it('пустой чип оставляет только настоящему нулю', () => {
        expect(filledSegments(0)).toBe(0);
        expect(filledSegments(3)).toBe(1);
        expect(filledSegments(null)).toBe(0);
    });
});
