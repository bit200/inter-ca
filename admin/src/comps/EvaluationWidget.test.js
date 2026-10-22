import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EvaluationWidget from './EvaluationWidget';

jest.mock('libs/Skeleton', () => () => null);

const mockApi = routes => {
    global.http = {
        get: url => (routes[url] ? Promise.resolve(routes[url]) : Promise.reject(new Error('x'))),
    };
};

const renderWidget = () => render(<MemoryRouter><EvaluationWidget /></MemoryRouter>);

describe('EvaluationWidget', () => {
    it('в счётчик входят и ответы, и оценки задач', async () => {
        mockApi({
            '/evaluate-list': { done: 2, total: 4 },
            '/my-code-review-stats': { done: 1, total: 2 },
        });
        renderWidget();
        await waitFor(() => expect(screen.getByText('/6')).toBeInTheDocument());
        expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('если эндпоинт задач недоступен, остаются оценки ответов', async () => {
        mockApi({ '/evaluate-list': { done: 2, total: 4 } });
        renderWidget();
        await waitFor(() => expect(screen.getByText('/4')).toBeInTheDocument());
    });
});
