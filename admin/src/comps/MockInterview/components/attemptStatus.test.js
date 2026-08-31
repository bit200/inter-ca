import { isStaleStarted, attemptStatusLabel, STALE_STARTED_MS } from './attemptStatus';

const NOW = new Date('2026-08-31T12:00:00Z').getTime();
const startedAgo = (ms, status = 'started') => ({ status, ud: new Date(NOW - ms).toISOString() });

describe('attemptStatus', () => {
    it('попытку, висящую в "начато" больше 5 часов, считает брошенной', () => {
        expect(isStaleStarted(startedAgo(STALE_STARTED_MS + 60000), NOW)).toBe(true);
        expect(isStaleStarted(startedAgo(6 * 60 * 60 * 1000), NOW)).toBe(true);
    });

    it('свежую начатую попытку не трогает', () => {
        expect(isStaleStarted(startedAgo(60 * 60 * 1000), NOW)).toBe(false);
        expect(isStaleStarted(startedAgo(STALE_STARTED_MS - 1000), NOW)).toBe(false);
    });

    it('старые попытки в других статусах брошенными не считает', () => {
        expect(isStaleStarted(startedAgo(10 * 60 * 60 * 1000, 'completed'), NOW)).toBe(false);
        expect(isStaleStarted(startedAgo(10 * 60 * 60 * 1000, 'draft'), NOW)).toBe(false);
        expect(isStaleStarted(null, NOW)).toBe(false);
        expect(isStaleStarted({ status: 'started' }, NOW)).toBe(false);
    });

    it('берёт время старта из cd, если ud нет', () => {
        expect(isStaleStarted({ status: 'started', cd: new Date(NOW - 6 * 60 * 60 * 1000).toISOString() }, NOW)).toBe(true);
    });

    it('брошенную попытку подписывает как завершённую по таймауту', () => {
        expect(attemptStatusLabel(startedAgo(6 * 60 * 60 * 1000), NOW)).toBe('Завершено по таймауту');
        expect(attemptStatusLabel(startedAgo(60 * 60 * 1000), NOW)).toBe('Начато');
        expect(attemptStatusLabel({ status: 'evaluated' }, NOW)).toBe('Завершено');
    });
});
