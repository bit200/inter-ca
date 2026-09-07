import React from 'react';
import { render, screen, act } from '@testing-library/react';

jest.mock('react-router-dom', () => ({
    Link: ({ to, children, ...rest }) => <a href={to} {...rest}>{children}</a>,
}));

import CourseInterviewHistory from './CourseInterviewHistory';

describe('CourseInterviewHistory - история попыток интервью на странице курса', () => {
    beforeEach(() => {
        global.t = (key) => key;
        global.http = {
            get: jest.fn(() => Promise.resolve({
                items: [
                    { _id: 'a1', status: 'evaluated', attemptNumber: 1, cd: '2026-01-01T10:00:00Z', turns: [{}], evaluate: [{ questionId: 'q1', evaluate: { score: 8 } }] },
                    { _id: 'a2', status: 'started', attemptNumber: 2, cd: '2026-02-01T10:00:00Z' },
                ],
            })),
        };
    });

    async function renderHistory(props = {}) {
        render(<CourseInterviewHistory interviewId={9} {...props} />);
        await act(async () => {});
    }

    it('грузит попытки по interviewId квиза и показывает их строками', async () => {
        await renderHistory();

        expect(global.http.get).toHaveBeenCalledWith(
            '/mock-interview/my-list',
            { filter: { interviewId: 9 } },
            { wo_notify: true }
        );
        expect(screen.getAllByTestId('course-interview-attempt-row')).toHaveLength(2);
    });

    it('у завершённой попытки показывает балл и ведёт на страницу результатов', async () => {
        await renderHistory();

        expect(screen.getByText('8/10')).toBeInTheDocument();
        expect(screen.getAllByTestId('course-interview-attempt-row')[1]).toHaveAttribute('href', '/mock-interviews/a1');
    });

    it('без interviewId ничего не рисует и в сеть не ходит', async () => {
        await renderHistory({ interviewId: null });

        expect(global.http.get).not.toHaveBeenCalled();
        expect(screen.queryByTestId('course-interview-history')).toBeNull();
    });
});
