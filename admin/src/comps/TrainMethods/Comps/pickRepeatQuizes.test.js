import { pickRepeatQuizes, addGeneralQuizFallback } from './mainMethods';

// Баг: вкладка "На повторение" показывает вопросы (все прочитанные, isRead), а клик по
// такому вопросу открывал модалку "На данный момент вы повторили все задания" - выборка
// брала квизы строго из questionsWithQuizes, и вопрос без собственных квизов давал пустой
// список. Ожидаем общий (general) квиз по самому вопросу.

const NOW = new Date('2026-08-31T12:00:00Z').getTime();

describe('pickRepeatQuizes', () => {
    it('для вопроса из списка без собственных квизов отдаёт общий квиз, а не пустоту', () => {
        let quizes = pickRepeatQuizes({
            questionsWithQuizes: { 20: [{ _id: 'q20' }] },
            questionIds: [{ _id: 10 }],
            visibleQuestionsObj: { 10: true, 20: true },
            total: 7,
            now: NOW,
        });

        expect(quizes).toHaveLength(1);
        expect(quizes[0]).toMatchObject({ question: '10', isGeneral: true });
    });

    it('если у вопроса есть свои квизы, заглушку не подставляет', () => {
        let quizes = pickRepeatQuizes({
            questionsWithQuizes: { 10: [{ _id: 'a' }, { _id: 'b' }] },
            questionIds: [{ _id: 10 }],
            visibleQuestionsObj: { 10: true },
            total: 7,
            now: NOW,
        });

        expect(quizes.map(it => it._id)).toEqual(['a', 'b']);
        expect(quizes.some(it => it.isGeneral)).toBe(false);
    });

    it('не берёт вопросы, которых нет в списке на повторение', () => {
        let quizes = pickRepeatQuizes({
            questionsWithQuizes: { 10: [{ _id: 'a' }] },
            questionIds: [{ _id: 10 }],
            visibleQuestionsObj: {},
            total: 7,
            now: NOW,
        });

        expect(quizes).toEqual([]);
    });

    it('обрезает выборку по total', () => {
        let quizes = pickRepeatQuizes({
            questionsWithQuizes: { 10: [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }] },
            questionIds: [{ _id: 10 }],
            visibleQuestionsObj: { 10: true },
            total: 2,
            now: NOW,
        });

        expect(quizes).toHaveLength(2);
    });

    it('не падает, когда бэкенд не прислал questionsWithQuizes', () => {
        let quizes = pickRepeatQuizes({
            questionIds: [{ _id: 10 }],
            visibleQuestionsObj: { 10: true },
            now: NOW,
        });

        expect(quizes).toHaveLength(1);
        expect(quizes[0].isGeneral).toBe(true);
    });
});

describe('addGeneralQuizFallback', () => {
    it('добавляет общий квиз только тем вопросам, у которых своих квизов нет', () => {
        let res = addGeneralQuizFallback([{ _id: 'a', question: '10' }], ['10', '11']);

        expect(res).toHaveLength(2);
        expect(res[1]).toMatchObject({ question: '11', isGeneral: true, order: 1 });
    });
});
