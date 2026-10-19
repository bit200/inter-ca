import {handleCourseLoadError} from './courseLoadError';

describe('ошибка загрузки курса', () => {
    test('курс не найден: notify вместо alert и переход на /courses', () => {
        const notify = {error: jest.fn()}, go = jest.fn();
        window.alert = jest.fn();
        expect(handleCourseLoadError({error: true, msg: 'Курс не найден'}, {notify, go})).toBe(true);
        expect(notify.error).toHaveBeenCalledWith('Курс не найден');
        expect(go).toHaveBeenCalledWith('/courses');
        expect(window.alert).not.toHaveBeenCalled();
    });
    test('без msg берётся текст по умолчанию', () => {
        const notify = {error: jest.fn()};
        handleCourseLoadError({error: 1}, {notify, go: jest.fn()});
        expect(notify.error).toHaveBeenCalledWith('Курс не найден');
    });
    test('успешный ответ не обрабатывается', () => {
        const notify = {error: jest.fn()}, go = jest.fn();
        expect(handleCourseLoadError({courseUser: {}}, {notify, go})).toBe(false);
        expect(go).not.toHaveBeenCalled();
    });
});
