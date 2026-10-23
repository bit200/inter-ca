import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RecentAiEvaluations from './RecentAiEvaluations';
import { STATUS_COLOR, STATUS_LABEL } from '../../EvaluationDetail/evaluationStatus';

// Данные виджет тянет сам через global.http (см. _global.js) - в тесте
// достаточно подменить get на отдачу готового списка.
const mockList = items => {
    global.http = { get: () => Promise.resolve({ items }) };
};

const item = (id, score, status = 'done') => ({
    _id: id,
    question: id,
    titleInfo: { title: 'Вопрос ' + id },
    evaluate: { status, result: score == null ? {} : { score } },
});

const renderWidget = () => render(<MemoryRouter><RecentAiEvaluations /></MemoryRouter>);

describe('RecentAiEvaluations', () => {
    it('у готовой оценки показывает только балл, без слова "Оценено"', async () => {
        mockList([item('a', 3.5)]);
        renderWidget();
        await waitFor(() => expect(screen.getByText('3.5/10')).toBeInTheDocument());
        expect(screen.queryByText('Оценено')).not.toBeInTheDocument();
    });

    it('пока балла нет, показывает подпись статуса', async () => {
        mockList([item('a', null, 'processing')]);
        renderWidget();
        await waitFor(() => expect(screen.getByText(STATUS_LABEL.processing)).toBeInTheDocument());
    });

    it('балл красит по порогам: провал - красный, середина - жёлтый, норма - зелёный', async () => {
        mockList([item('a', 3.5), item('b', 5.7), item('c', 9)]);
        renderWidget();
        await waitFor(() => expect(screen.getByText('3.5/10')).toBeInTheDocument());
        expect(screen.getByText('3.5/10')).toHaveStyle({ color: STATUS_COLOR.error });
        expect(screen.getByText('5.7/10')).toHaveStyle({ color: STATUS_COLOR.processing });
        expect(screen.getByText('9/10')).toHaveStyle({ color: STATUS_COLOR.done });
    });

    it('подмешивает ИИ-оценки задач модулей курса по дате, задачи экзаменов не берёт', async () => {
        global.http = {
            get: url => Promise.resolve(url === '/my-code-reviews'
                ? { items: [
                    { _id: 's1', exam: null, courseModule: 5, question: 21, cd: '2026-10-22T12:00:00Z', status: 'done', title: 'Debounce', score: 8 },
                    { _id: 'r1', exam: 7, courseModule: null, question: 11, cd: '2026-10-22T13:00:00Z', status: 'done', title: 'Две суммы', score: 6 },
                ] }
                : { items: [{ ...item('a', 4), cd: '2026-10-22T11:00:00Z' }] }),
        };
        renderWidget();
        await waitFor(() => expect(screen.getByText('Debounce')).toBeInTheDocument());
        expect(screen.queryByText('Две суммы')).not.toBeInTheDocument();
        const rows = screen.getAllByTestId('recent-ai-evaluation-item');
        expect(rows.map(r => r.textContent)).toEqual(['Debounce8/10', 'Вопрос a4/10']);
        expect(rows[0].querySelector('a')).toHaveAttribute('href', '/evaluations/task/s1');
        expect(screen.getAllByTestId('recent-ai-evaluation-task')).toHaveLength(1);
    });
});
