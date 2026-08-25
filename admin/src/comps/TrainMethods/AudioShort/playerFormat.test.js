import {formatPlaybackRate, formatPlayerClock, playerSeekStepSeconds, waveformBars} from './playerFormat';

describe('formatPlayerClock', () => {
    it('показывает минуты и секунды', () => {
        expect(formatPlayerClock(0)).toBe('0:00');
        expect(formatPlayerClock(7)).toBe('0:07');
        expect(formatPlayerClock(131)).toBe('2:11');
    });

    it('добавляет часы только когда они есть', () => {
        expect(formatPlayerClock(3599)).toBe('59:59');
        expect(formatPlayerClock(3849)).toBe('1:04:09');
    });

    it('не падает на мусоре и отрицательных значениях', () => {
        expect(formatPlayerClock(NaN)).toBe('0:00');
        expect(formatPlayerClock(Infinity)).toBe('0:00');
        expect(formatPlayerClock(-5)).toBe('0:00');
        expect(formatPlayerClock(undefined)).toBe('0:00');
    });
});

describe('formatPlaybackRate', () => {
    it('пишет скорость по-русски, с запятой и знаком умножения', () => {
        expect(formatPlaybackRate(1)).toBe('1×');
        expect(formatPlaybackRate(1.25)).toBe('1,25×');
        expect(formatPlaybackRate(0.75)).toBe('0,75×');
    });
});

describe('waveformBars', () => {
    it('даёт нужное число столбиков в пределах от 0 до 1', () => {
        let bars = waveformBars('/audio/1.mp3');
        expect(bars).toHaveLength(40);
        bars.forEach(height => {
            expect(height).toBeGreaterThan(0);
            expect(height).toBeLessThanOrEqual(1);
        });
    });

    it('у одной записи волна всегда одна и та же, у разных — разная', () => {
        expect(waveformBars('/audio/1.mp3')).toEqual(waveformBars('/audio/1.mp3'));
        expect(waveformBars('/audio/1.mp3')).not.toEqual(waveformBars('/audio/2.mp3'));
    });

    it('работает без источника', () => {
        expect(waveformBars('', 12)).toHaveLength(12);
    });
});

describe('шаг перемотки', () => {
    it('равен 15 секундам — столько же написано на кнопках', () => {
        expect(playerSeekStepSeconds).toBe(15);
    });
});
