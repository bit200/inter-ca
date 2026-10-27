import {checkQuizOnServer, isCorrectVariant, quizAnswerPayload} from './quizServerCheck';

// в данных квиза нет variations[].isCorrect — верность приходит только с сервера
const quiz = {_id: 5, variations: [{name: 'a'}, {name: 'b'}, {name: 'c'}]};

describe('проверка квиза на сервере', () => {
    afterEach(() => { delete global.http; });

    test('шлёт имена в показанном порядке и берёт isCorrect и правильные индексы у сервера', async () => {
        global.http = {post: jest.fn(() => Promise.resolve({isCorrect: false, correctIndexes: [2]}))};
        let res = await checkQuizOnServer(quiz, [0]);
        expect(global.http.post).toHaveBeenCalledWith('/check-quiz-answer', {
            quiz: 5, answer: {variations: ['a', 'b', 'c'], selected: [0]},
        });
        expect(res).toEqual({isCorrect: false, correctIndexes: [2]});
    });

    test('сервер недоступен и isCorrect в данных нет: ответ не засчитан, без падения', async () => {
        global.http = {post: jest.fn(() => Promise.reject(new Error('boom')))};
        jest.spyOn(console, 'error').mockImplementation(() => {});
        expect(await checkQuizOnServer(quiz, [0])).toEqual({isCorrect: false, correctIndexes: []});
    });

    test('сервер недоступен, isCorrect в данных ещё есть: локальная проверка', async () => {
        global.http = {post: jest.fn(() => Promise.reject(new Error('boom')))};
        jest.spyOn(console, 'error').mockImplementation(() => {});
        let q = {_id: 1, variations: [{name: 'a'}, {name: 'b', isCorrect: true}]};
        expect(await checkQuizOnServer(q, [1])).toEqual({isCorrect: true, correctIndexes: [1]});
    });

    test('подсветка: по индексам сервера, без них — по isCorrect варианта', () => {
        expect(isCorrectVariant({name: 'a'}, 2, [2])).toBe(true);
        expect(isCorrectVariant({name: 'a', isCorrect: true}, 0, [2])).toBe(false);
        expect(isCorrectVariant({name: 'a', isCorrect: true}, 0, null)).toBe(true);
        expect(isCorrectVariant({name: 'a'}, 0, null)).toBe(false);
    });

    test('quizAnswerPayload', () => {
        expect(quizAnswerPayload(quiz, [1])).toEqual({variations: ['a', 'b', 'c'], selected: [1]});
    });
});
