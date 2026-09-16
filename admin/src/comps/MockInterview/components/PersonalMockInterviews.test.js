import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PersonalMockInterviews from './PersonalMockInterviews';

const setupHttp = (items, attempts = []) => {
    global.http = {
        get: jest.fn((url) => Promise.resolve({ items: url === '/mock-interview/my-list' ? attempts : items })),
        post: jest.fn(() => Promise.resolve({ item: { _id: 'attempt-9' } })),
    };
    global.notify = { warning: jest.fn() };
};

const renderSection = () => render(
    <MemoryRouter initialEntries={['/mock-interviews']}>
        <Routes>
            <Route path="/mock-interviews" element={<PersonalMockInterviews/>}/>
            <Route path="/mock-interviews/:id" element={<div>attempt page</div>}/>
        </Routes>
    </MemoryRouter>
);

describe('PersonalMockInterviews', () => {
    it('рисует секцию «Собрано по вашим ответам» из /my-personal-mock-interview', async () => {
        setupHttp([
            { interviewId: 'p1', sourceInterviewId: 5, state: 'published', cd: '2026-09-10' },
            { interviewId: 'p2', sourceInterviewId: 6, state: 'published', cd: '2026-09-01' },
        ]);
        renderSection();

        expect(await screen.findByText('Собрано по вашим ответам')).toBeInTheDocument();
        expect(screen.getAllByTestId('personal-mock-interview-item')).toHaveLength(2);
        expect(global.http.get).toHaveBeenCalledWith('/my-personal-mock-interview', {}, { wo_notify: true });
    });

    it('ведёт к разбору интервью, по слабым ответам которого собрано', async () => {
        setupHttp([{ interviewId: 'p1', sourceInterviewId: 5, state: 'published', cd: '2026-09-10' }]);
        renderSection();

        const link = await screen.findByTestId('personal-mock-interview-source');
        expect(link).toHaveAttribute('href', '/interviews/5?tab=dialog');
    });

    it('без персональных интервью секцию не показывает', async () => {
        setupHttp([]);
        renderSection();
        await waitFor(() => expect(global.http.get).toHaveBeenCalled());
        expect(screen.queryByTestId('personal-mock-interviews')).toBeNull();
    });

    it('по клику создаёт/продолжает попытку с interviewId записи и открывает её', async () => {
        setupHttp([{ interviewId: 'p1', sourceInterviewId: 5, state: 'published', cd: '2026-09-10' }]);
        renderSection();

        fireEvent.click(await screen.findByTestId('personal-mock-interview-start'));

        expect(global.http.post).toHaveBeenCalledWith(
            '/mock-interview/my-list',
            { interviewId: 'p1', name: 'Персональное интервью от 10 сентября 2026 г.' },
            { wo_notify: true },
        );
        expect(await screen.findByText('attempt page')).toBeInTheDocument();
    });

    it('не показывает интервью, по которому уже есть попытка', async () => {
        setupHttp(
            [
                { interviewId: 'p1', sourceInterviewId: 5, state: 'published', cd: '2026-09-10' },
                { interviewId: 'p2', sourceInterviewId: 6, state: 'published', cd: '2026-09-01' },
            ],
            [{ _id: 1, interviewId: 'p1', status: 'started' }],
        );
        renderSection();

        expect(await screen.findAllByTestId('personal-mock-interview-item')).toHaveLength(1);
        expect(global.http.get).toHaveBeenCalledWith(
            '/mock-interview/my-list',
            { filter: { interviewId: { $in: ['p1', 'p2'] } } },
            { wo_notify: true },
        );
    });

    it('когда все интервью уже начаты или пройдены, секцию не показывает', async () => {
        setupHttp(
            [{ interviewId: 'p1', sourceInterviewId: 5, state: 'published', cd: '2026-09-10' }],
            [{ _id: 1, interviewId: 'p1', status: 'completed' }],
        );
        renderSection();
        await waitFor(() => expect(global.http.get).toHaveBeenCalledTimes(2));
        expect(screen.queryByTestId('personal-mock-interviews')).toBeNull();
    });
});
