import { getCoursePerc } from './mainMethods';

// underscore в проекте глобальный (см. _global.js) - mainMethods зовёт его без импорта
describe('getCoursePerc - процент прохождения курса', () => {
    beforeAll(() => { global._ = require('underscore'); });

    let course = { _id: 1337 };
    let okAll = (ids) => ids.reduce((acc, id) => ({ ...acc, [id]: { status: 'ok' } }), {});

    it('полностью пройденный курс даёт 100%, даже если модуль закрыт финальным интервью', () => {
        // реальный случай задачи #1038: один модуль, шесть топиков, mHistory пуст -
        // раньше выходило 6 из 7, то есть 86%
        let history = {
            1337: {
                modules: [{ module: 500, questions: [1, 2, 3, 4, 5, 6] }],
                qHistory: okAll([1, 2, 3, 4, 5, 6]),
                mHistory: {},
            },
        };
        expect(getCoursePerc(course, history)).toBe(100);
    });

    it('модуль с отметкой ok в mHistory тоже считается пройденным', () => {
        let history = {
            1337: {
                modules: [{ module: 500, questions: [1, 2] }],
                qHistory: okAll([1, 2]),
                mHistory: { 500: { status: 'ok' } },
            },
        };
        expect(getCoursePerc(course, history)).toBe(100);
    });

    it('незакрытый модуль не считается пройденным, пока есть непройденные топики', () => {
        let history = {
            1337: {
                modules: [{ module: 500, questions: [1, 2, 3] }],
                qHistory: okAll([1]),
                mHistory: {},
            },
        };
        // 1 из 4: сам модуль не пройден, пройден один топик из трёх
        expect(getCoursePerc(course, history)).toBe(25);
    });

    it('модуль без топиков не засчитывается пройденным сам по себе', () => {
        let history = {
            1337: { modules: [{ module: 500, questions: [] }], qHistory: {}, mHistory: {} },
        };
        expect(getCoursePerc(course, history)).toBe(0);
    });

    it('курса нет в истории - 0%, без падения', () => {
        expect(getCoursePerc(course, {})).toBe(0);
    });
});
