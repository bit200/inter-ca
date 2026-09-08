import { isAttemptFinished, attemptStatusLabel } from './attemptStatus';

// Статус 'completed' проставляет только фронт (см. MockInterviewCore.handleComplete).
// Если вкладку закрыли раньше, чем ушёл PUT, попытка остаётся 'started' - при том,
// что собеседование прошло и диалог с оценкой по нему уже лежат на бэкенде.
describe('isAttemptFinished', () => {
    it('пройденные статусы считает завершёнными', () => {
        expect(isAttemptFinished({ status: 'completed', turns: [] })).toBe(true);
        expect(isAttemptFinished({ status: 'evaluated', turns: [] })).toBe(true);
    });

    it('застрявшую в "Начато" попытку с разобранным диалогом считает завершённой', () => {
        expect(isAttemptFinished({ status: 'started', turns: [{ question_id: 'q1' }] })).toBe(true);
    });

    it('застрявшую в "Начато" попытку с посчитанной оценкой считает завершённой', () => {
        expect(isAttemptFinished({ status: 'started', turns: [], evaluate: [{ evaluate: { score: 7 } }] })).toBe(true);
        expect(isAttemptFinished({
            status: 'started',
            turns: [],
            evaluateState: { jobs: [{ questionId: 'q1', status: 'done' }] },
        })).toBe(true);
    });

    it('начатую попытку без следов собеседования завершённой не считает', () => {
        expect(isAttemptFinished({ status: 'started', turns: [], evaluate: [] })).toBe(false);
        expect(isAttemptFinished({ status: 'draft' })).toBe(false);
        expect(isAttemptFinished(null)).toBe(false);
    });
});

describe('attemptStatusLabel', () => {
    it('застрявшую попытку подписывает "Завершено", а не "Начато"', () => {
        expect(attemptStatusLabel({ status: 'started', turns: [{ question_id: 'q1' }] })).toBe('Завершено');
    });

    it('по-настоящему начатую попытку подписывает "Начато"', () => {
        expect(attemptStatusLabel({ status: 'started', turns: [] })).toBe('Начато');
        expect(attemptStatusLabel({ status: 'draft' })).toBe('Ожидает');
    });
});
