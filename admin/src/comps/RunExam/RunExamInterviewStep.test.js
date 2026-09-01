import { render, screen, waitFor } from '@testing-library/react';
import RunExamInterviewStep from './RunExamInterviewStep';

jest.mock('../MockInterview/MockInterviewCore', () => ({attemptId}) => <div>core-{attemptId}</div>);

beforeEach(() => {
    global.t = (key) => key;
});

describe('Мок-интервью последним шагом экзамена', () => {
    test('создаёт попытку по interviewId и показывает интервью', async () => {
        global.http = { post: jest.fn(() => Promise.resolve({ item: { _id: 501 } })) };

        render(<RunExamInterviewStep interviewId={'int-77'}/>);

        expect(screen.getByText('preparingMockInterview')).toBeInTheDocument();
        await waitFor(() => expect(screen.getByText('core-501')).toBeInTheDocument());
        expect(global.http.post).toHaveBeenCalledWith('/mock-interview/my-list', { interviewId: 'int-77' }, { wo_notify: true });
    });

    test('не создаёт попытку, пока интервью не привязано', () => {
        global.http = { post: jest.fn() };

        render(<RunExamInterviewStep interviewId={''}/>);

        expect(global.http.post).not.toHaveBeenCalled();
        expect(screen.getByText('preparingMockInterview')).toBeInTheDocument();
    });

    test('сообщает, что интервью не открылось, если попытку создать не удалось', async () => {
        global.http = { post: () => Promise.reject(new Error('boom')) };

        render(<RunExamInterviewStep interviewId={'int-77'}/>);

        await waitFor(() => expect(screen.getByText('mockInterviewNotStarted')).toBeInTheDocument());
    });
});
