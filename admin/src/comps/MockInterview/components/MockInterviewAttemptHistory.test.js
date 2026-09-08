import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MockInterviewAttemptHistory from './MockInterviewAttemptHistory';
import lngs from '../../i18/lngs';

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

    it('у завершённой попытки без единой оценки пишет, что результатов пока нет', () => {
        const empty = { _id: 2, status: 'completed', attemptNumber: 2, turns: [], evaluate: [] };
        render(<MockInterviewAttemptHistory
            history={[empty, attempt(1, [{ evaluate: { score: 5 } }], 1)]}
            currentItem={empty}
            latestCompleted={true}
            onRetake={() => {}}
        />);
        expect(screen.getByText('Результаты пока недоступны')).toBeInTheDocument();
    });

    it('единственную попытку без результатов подписывает над кнопкой "Пройти заново"', () => {
        const empty = { _id: 2, status: 'completed', attemptNumber: 1, turns: [], evaluate: [] };
        render(<MockInterviewAttemptHistory
            history={[empty]}
            currentItem={empty}
            latestCompleted={true}
            onRetake={() => {}}
        />);
        expect(screen.getByText('Результаты пока недоступны')).toBeInTheDocument();
        expect(screen.queryByText('История попыток')).not.toBeInTheDocument();
    });

    it('у начатой попытки из списка даёт кнопку "Продолжить"', () => {
        const started = { _id: 3, status: 'started', attemptNumber: 2, turns: [], evaluate: [] };
        const current = attempt(1, [{ evaluate: { score: 5 } }], 1);
        const onContinue = jest.fn();
        render(<MockInterviewAttemptHistory
            history={[started, current]}
            currentItem={current}
            latestCompleted={false}
            onRetake={() => {}}
            onContinue={onContinue}
        />);
        fireEvent.click(screen.getByTestId('mock-interview-continue-button'));
        expect(onContinue).toHaveBeenCalledWith(started);
    });

    it('у текущей и у завершённых попыток кнопки "Продолжить" нет', () => {
        const started = { _id: 3, status: 'started', attemptNumber: 2, turns: [], evaluate: [] };
        render(<MockInterviewAttemptHistory
            history={[started, attempt(1, [{ evaluate: { score: 5 } }], 1)]}
            currentItem={started}
            latestCompleted={false}
            onRetake={() => {}}
            onContinue={() => {}}
        />);
        expect(screen.queryByTestId('mock-interview-continue-button')).not.toBeInTheDocument();
    });

    it('у завершённой попытки из списка даёт кнопку "Смотреть результаты"', () => {
        const past = attempt(1, [{ evaluate: { score: 5 } }], 1);
        const current = attempt(2, [{ evaluate: { score: 8 } }], 1);
        const onOpenResults = jest.fn();
        render(<MockInterviewAttemptHistory
            history={[current, past]}
            currentItem={current}
            latestCompleted={true}
            onRetake={() => {}}
            onOpenResults={onOpenResults}
        />);
        const buttons = screen.getAllByTestId('mock-interview-results-button');
        expect(buttons).toHaveLength(1);
        fireEvent.click(buttons[0]);
        expect(onOpenResults).toHaveBeenCalledWith(past);
    });

    it('подпись кнопки результатов берёт из словаря переводов', () => {
        const past = attempt(1, [{ evaluate: { score: 5 } }], 1);
        const current = attempt(2, [{ evaluate: { score: 8 } }], 1);
        global.t = (key) => lngs[key] && lngs[key].ru;
        render(<MockInterviewAttemptHistory
            history={[current, past]}
            currentItem={current}
            latestCompleted={true}
            onRetake={() => {}}
            onOpenResults={() => {}}
        />);
        expect(screen.getByTestId('mock-interview-results-button')).toHaveTextContent('Смотреть результаты');
        expect(Object.keys(lngs.openAttemptResults)).toEqual(['ru', 'es', 'de', 'en', 'fr']);
        global.t = () => null;
    });

    it('у незавершённой попытки кнопки "Смотреть результаты" нет', () => {
        const started = { _id: 3, status: 'started', attemptNumber: 2, turns: [], evaluate: [] };
        const current = attempt(1, [{ evaluate: { score: 5 } }], 1);
        render(<MockInterviewAttemptHistory
            history={[started, current]}
            currentItem={current}
            latestCompleted={false}
            onRetake={() => {}}
            onOpenResults={() => {}}
        />);
        expect(screen.queryByTestId('mock-interview-results-button')).not.toBeInTheDocument();
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
        expect(screen.queryByText('Результаты пока недоступны')).not.toBeInTheDocument();
    });

    it('показывает название интервью и сколько всего попыток', () => {
        const current = { ...attempt(2, [{ evaluate: { score: 8 } }], 1), name: 'Java Junior' };
        render(<MockInterviewAttemptHistory
            history={[current, attempt(1, [{ evaluate: { score: 5 } }], 1)]}
            currentItem={current}
            latestCompleted={true}
            onRetake={() => {}}
        />);
        expect(screen.getByText('Java Junior')).toBeInTheDocument();
        expect(screen.getByTestId('mock-interview-attempt-counter')).toHaveTextContent('Попытка 2 из 2');
    });

    it('счётчик считает попытки от первой к последней', () => {
        const previous = attempt(1, [{ evaluate: { score: 5 } }], 1);
        render(<MockInterviewAttemptHistory
            history={[attempt(2, [{ evaluate: { score: 8 } }], 1), previous]}
            currentItem={previous}
            latestCompleted={true}
            onRetake={() => {}}
        />);
        expect(screen.getByTestId('mock-interview-attempt-counter')).toHaveTextContent('Попытка 1 из 2');
    });
    // Попытка, у которой собеседование прошло, но статус остался 'started'
    // (вкладку закрыли раньше, чем ушёл PUT status: 'completed').
    it('застрявшую в "Начато" попытку с диалогом показывает завершённой и с результатами', () => {
        const stuck = { _id: 3, status: 'started', attemptNumber: 2, turns: [{ question_id: 'q1' }], evaluate: [{ questionId: 'q1', evaluate: { score: 9 } }] };
        const current = attempt(1, [{ evaluate: { score: 5 } }], 1);
        render(<MockInterviewAttemptHistory
            history={[stuck, current]}
            currentItem={current}
            latestCompleted={true}
            onRetake={() => {}}
            onContinue={() => {}}
            onOpenResults={() => {}}
        />);
        expect(screen.getAllByText('Завершено')).toHaveLength(2);
        expect(screen.queryByText('Начато')).not.toBeInTheDocument();
        expect(screen.queryByTestId('mock-interview-continue-button')).not.toBeInTheDocument();
        expect(screen.getByTestId('mock-interview-results-button')).toBeInTheDocument();
        expect(screen.getByText('Балл: 9/10')).toBeInTheDocument();
    });
});
