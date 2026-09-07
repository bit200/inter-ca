import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RecentMockInterviews, { groupAttemptsByInterview } from './RecentMockInterviews';

// Список виджет тянет сам через global.http (см. _global.js) - в тесте
// достаточно подменить get на отдачу готовых попыток.
const mockList = items => {
    global.http = { get: () => Promise.resolve({ items }) };
};

const attempt = (id, interviewId, cd, extra = {}) => ({
    _id: id,
    interviewId,
    name: 'Интервью ' + interviewId,
    status: 'evaluated',
    cd,
    evaluate: [],
    ...extra,
});

const renderWidget = () => render(<MemoryRouter><RecentMockInterviews /></MemoryRouter>);

describe('groupAttemptsByInterview', () => {
    it('схлопывает попытки одного интервью и оставляет самую свежую', () => {
        const groups = groupAttemptsByInterview([
            attempt('a1', 'i1', '2026-01-01'),
            attempt('a3', 'i1', '2026-03-01'),
            attempt('a2', 'i1', '2026-02-01'),
        ]);
        expect(groups).toHaveLength(1);
        expect(groups[0].latest._id).toBe('a3');
        expect(groups[0].attempts).toBe(3);
    });

    it('разные интервью не смешивает и сортирует свежими вперёд', () => {
        const groups = groupAttemptsByInterview([
            attempt('a1', 'i1', '2026-01-01'),
            attempt('b1', 'i2', '2026-05-01'),
        ]);
        expect(groups.map(g => g.latest._id)).toEqual(['b1', 'a1']);
    });

    it('попытки без interviewId группирует по названию', () => {
        const groups = groupAttemptsByInterview([
            { _id: 'x1', name: 'Старое интервью', cd: '2026-01-01' },
            { _id: 'x2', name: 'Старое интервью', cd: '2026-02-01' },
        ]);
        expect(groups).toHaveLength(1);
        expect(groups[0].latest._id).toBe('x2');
    });
});

describe('RecentMockInterviews', () => {
    it('одно интервью с тремя попытками показывает одной строкой с названием', async () => {
        mockList([
            attempt('a1', 'i1', '2026-01-01'),
            attempt('a2', 'i1', '2026-02-01'),
            attempt('a3', 'i1', '2026-03-01'),
        ]);
        renderWidget();
        await waitFor(() => expect(screen.getByText('Интервью i1')).toBeInTheDocument());
        expect(screen.getAllByTestId('recent-mock-interview-item')).toHaveLength(1);
        expect(screen.getByTestId('recent-mock-interview-item')).toHaveAttribute('data-item-id', 'a3');
        expect(screen.getByTestId('recent-mock-interview-attempts')).toHaveTextContent('3 попытки');
    });

    it('у интервью с единственной попыткой счётчика попыток нет', async () => {
        mockList([attempt('a1', 'i1', '2026-01-01')]);
        renderWidget();
        await waitFor(() => expect(screen.getByText('Интервью i1')).toBeInTheDocument());
        expect(screen.queryByTestId('recent-mock-interview-attempts')).not.toBeInTheDocument();
    });

    it('ссылка строки ведёт на последнюю попытку интервью', async () => {
        mockList([
            attempt('a1', 'i1', '2026-01-01'),
            attempt('a2', 'i1', '2026-02-01'),
        ]);
        renderWidget();
        await waitFor(() => expect(screen.getByText('Интервью i1')).toBeInTheDocument());
        expect(screen.getByText('Интервью i1').closest('a')).toHaveAttribute('href', '/mock-interviews/a2');
    });
});
