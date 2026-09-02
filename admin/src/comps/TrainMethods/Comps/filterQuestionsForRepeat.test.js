import { filterQuestionsForRepeat, hasRepeatQuizes } from './mainMethods';

// Баг: во вкладке "На повторение" видны все прочитанные вопросы, но у части из них нет
// ни одного квиза - клик по такому вопросу открывал заглушку "На данный момент вы
// повторили все задания". Общий квиз по вопросу тут не спасает: /load-by-any отдаёт
// квизы только по _id. Такие вопросы в список не попадают вовсе.

describe('filterQuestionsForRepeat', () => {
    it('убирает из списка вопросы без квизов', () => {
        let questions = [{ _id: 10, title: 'с квизом' }, { _id: 20, title: 'без квизов' }];
        let questionsWithQuizes = { 10: [{ _id: 'a' }] };

        expect(filterQuestionsForRepeat(questions, questionsWithQuizes)).toEqual([questions[0]]);
    });

    it('считает вопрос пустым, если у его квизов нет _id', () => {
        let questions = [{ _id: 10 }];

        expect(filterQuestionsForRepeat(questions, { 10: [] })).toEqual([]);
        expect(filterQuestionsForRepeat(questions, { 10: [{ isGeneral: true }] })).toEqual([]);
    });

    it('оставляет все вопросы, у которых квизы есть', () => {
        let questions = [{ _id: 10 }, { _id: 20 }];
        let questionsWithQuizes = { 10: [{ _id: 'a' }], 20: [{ _id: 'b' }, { _id: 'c' }] };

        expect(filterQuestionsForRepeat(questions, questionsWithQuizes)).toEqual(questions);
    });

    it('не падает на пустых входных данных', () => {
        expect(filterQuestionsForRepeat()).toEqual([]);
        expect(filterQuestionsForRepeat([{ _id: 10 }])).toEqual([]);
        expect(hasRepeatQuizes(null, 10)).toBe(false);
    });
});
