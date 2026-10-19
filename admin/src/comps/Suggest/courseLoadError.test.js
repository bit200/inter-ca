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
    test('без msg берётся переведённый текст по умолчанию', () => {
        const notify = {error: jest.fn()}, translate = jest.fn(k => 'tr:' + k);
        handleCourseLoadError({error: 1}, {notify, go: jest.fn(), translate});
        expect(notify.error).toHaveBeenCalledWith('tr:courseNotFound');
    });
    test('текст ошибки сервера выводится через перевод', () => {
        const notify = {error: jest.fn()}, translate = jest.fn(k => 'tr:' + k);
        handleCourseLoadError({error: true, msg: 'Course not found'}, {notify, go: jest.fn(), translate});
        expect(translate).toHaveBeenCalledWith('Course not found');
        expect(notify.error).toHaveBeenCalledWith('tr:Course not found');
    });
    test('успешный ответ не обрабатывается', () => {
        const notify = {error: jest.fn()}, go = jest.fn();
        expect(handleCourseLoadError({courseUser: {}}, {notify, go})).toBe(false);
        expect(go).not.toHaveBeenCalled();
    });
});
