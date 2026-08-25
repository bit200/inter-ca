import React from 'react';
import { render, screen } from '@testing-library/react';
import MockInterviewAttemptHistory from './MockInterviewAttemptHistory';

// t() в проекте лежит в global (см. _global.js) - в тесте компонента её
// достаточно свести к ключу, подписи берутся из фолбэков самого компонента.
beforeAll(() => { global.t = () => null; });

const attempt = (id, evaluate, turnsCount) => ({
    _id: id,
    status: 'evaluated',
    attemptNumber: id,
    turns: new Array(turnsCount).fill({}),
    evaluate,
});

describe('MockInterviewAttemptHistory', () => {
    it('к баллу частично оценённой попытки добавляет, сколько вопросов оценено', () => {
        const partial = attempt(2, [{ evaluate: { score: 8 } }, { evaluate: { score: 6 } }], 3);
        render(<MockInterviewAttemptHistory
            history={[partial, attempt(1, [{ evaluate: { score: 5 } }], 1)]}
            currentItem={partial}
            latestCompleted={true}
            onRetake={() => {}}
        />);
        expect(screen.getByText('Балл: 7/10')).toBeInTheDocument();
        expect(screen.getByText('Оценено 2 из 3 вопросов')).toBeInTheDocument();
    });

    it('на полностью оценённой попытке лишней подписи нет', () => {
        const full = attempt(2, [{ evaluate: { score: 8 } }, { evaluate: { score: 6 } }], 2);
        render(<MockInterviewAttemptHistory
            history={[full, attempt(1, [{ evaluate: { score: 5 } }], 1)]}
            currentItem={full}
            latestCompleted={true}
            onRetake={() => {}}
        />);
        expect(screen.queryByText(/Оценено \d+ из/)).not.toBeInTheDocument();
    });
});
