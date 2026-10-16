import {handleQuestionDenied, isQuestionDenied} from './questionAccessDenied';

describe('отказ в доступе к задаче вне курсов пользователя', () => {
    test('403 с ошибкой доступа: уведомление и переход на /courses', () => {
        const notify = {error: jest.fn()}, go = jest.fn();
        const r = handleQuestionDenied({error: 'question is not in your courses'}, {notify, go, message: 'нет доступа'});
        expect(r).toBe(true);
        expect(notify.error).toHaveBeenCalledWith('нет доступа');
        expect(go).toHaveBeenCalledWith('/courses');
    });
    test('прочие ошибки не обрабатываются', () => {
        const go = jest.fn();
        expect(handleQuestionDenied({error: 'boom'}, {notify: {error: jest.fn()}, go, message: 'x'})).toBe(false);
        expect(isQuestionDenied(undefined)).toBe(false);
        expect(go).not.toHaveBeenCalled();
    });
});
