import { rememberInterrupted, isAttemptInterrupted } from './attemptInterrupted';

describe('attemptInterrupted', () => {
    beforeEach(() => window.localStorage.clear());

    it('помнит прерванную попытку между перезагрузками страницы', () => {
        rememberInterrupted(1010, true);
        expect(isAttemptInterrupted({ _id: 1010 })).toBe(true);
    });

    it('доведённую до конца попытку прерванной не считает', () => {
        rememberInterrupted(1010, false);
        expect(isAttemptInterrupted({ _id: 1010 })).toBe(false);
        expect(isAttemptInterrupted({ _id: 2020 })).toBe(false);
        expect(isAttemptInterrupted(null)).toBe(false);
    });

    it('поле с бэкенда важнее локальной памяти', () => {
        rememberInterrupted(1010, true);
        expect(isAttemptInterrupted({ _id: 1010, interrupted: false })).toBe(false);
        expect(isAttemptInterrupted({ _id: 2020, interrupted: true })).toBe(true);
    });
});
