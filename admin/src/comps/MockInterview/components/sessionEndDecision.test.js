import {
    isActiveSessionStatus,
    isCancelledSessionStatus,
    isFinishedSessionStatus,
    sessionProgressOf,
} from './sessionEndDecision';

describe('sessionEndDecision', () => {
    it('closed - это тоже пройденное интервью, не только completed', () => {
        expect(isFinishedSessionStatus('closed')).toBe(true);
        expect(isFinishedSessionStatus('completed')).toBe(true);
        expect(isFinishedSessionStatus('finished')).toBe(true);
        expect(isFinishedSessionStatus('CLOSED')).toBe(true);
    });

    it('живые статусы сессии завершением не считаются', () => {
        ['active', 'in_progress', 'running', 'started', 'paused'].forEach(status => {
            expect(isActiveSessionStatus(status)).toBe(true);
            expect(isFinishedSessionStatus(status)).toBe(false);
        });
    });

    it('отменённые и сломанные сессии - конец, но не прохождение', () => {
        ['cancelled', 'canceled', 'aborted', 'expired', 'failed', 'error'].forEach(status => {
            expect(isCancelledSessionStatus(status)).toBe(true);
            expect(isFinishedSessionStatus(status)).toBe(false);
        });
    });

    it('прогресс сессии берётся из любого поля, которым itk-live его отдаёт', () => {
        expect(sessionProgressOf(null)).toBe(0);
        expect(sessionProgressOf({aiPlaying: true})).toBe(0);
        expect(sessionProgressOf({turns: 13})).toBe(13);
        expect(sessionProgressOf({turns: [{}, {}]})).toBe(2);
        expect(sessionProgressOf({questionIndex: 4, answersCount: 3})).toBe(4);
    });
});
