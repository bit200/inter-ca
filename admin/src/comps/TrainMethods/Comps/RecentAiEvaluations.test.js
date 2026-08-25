import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RecentAiEvaluations from './RecentAiEvaluations';
import { STATUS_COLOR } from '../../EvaluationDetail/evaluationStatus';

// Данные виджет тянет сам через global.http (см. _global.js) - в тесте
// достаточно подменить get на отдачу готового списка.
const mockList = items => {
    global.http = { get: () => Promise.resolve({ items }) };
};

const item = (id, score) => ({
    _id: id,
    question: id,
    titleInfo: { title: 'Вопрос ' + id },
    evaluate: { status: 'done', result: { score } },
});

const renderWidget = () => render(<MemoryRouter><RecentAiEvaluations /></MemoryRouter>);

describe('RecentAiEvaluations', () => {
    it('балл показывает зелёным независимо от значения', async () => {
        mockList([item('a', 3.5), item('b', 5.7), item('c', 9)]);
        renderWidget();
        await waitFor(() => expect(screen.getByText('3.5/10')).toBeInTheDocument());
        for (const text of ['3.5/10', '5.7/10', '9/10']) {
            expect(screen.getByText(text)).toHaveStyle({ color: STATUS_COLOR.done });
        }
    });
});
