import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import MockInterviewResults from './MockInterviewResults';

jest.mock('./MockInterviewQuestionList', () => () => <div>questions</div>);
jest.mock('./MockInterviewTurnDetail', () => ({ turn, onRetryEvaluate }) => (
    <button onClick={() => onRetryEvaluate(turn.question_id, { textOnly: !!turn.audioLost })}>
        retry
    </button>
));

const interviewWith = (job) => ({
    _id: 1000,
    turns: [{ question_id: 'q1', question: 'Вопрос', transcript: 'Ответ' }],
    evaluate: [],
    evaluateState: { status: 'errored', jobs: [job] },
});

describe('MockInterviewResults - перезапуск оценки вопроса', () => {
    beforeEach(() => {
        global.http = { post: jest.fn(() => Promise.resolve({})), get: jest.fn(() => Promise.resolve({ items: [] })) };
        global.notify = { success: jest.fn(), warning: jest.fn() };
    });

    it('на потерянном аудио просит оценить по одному тексту', async () => {
        render(<MockInterviewResults interview={interviewWith({ questionId: 'q1', status: 'errored', unrecoverable: true })}/>);
        await act(async () => { fireEvent.click(screen.getByText('retry')); });
        expect(global.http.post).toHaveBeenCalledWith(
            '/mock-interview/1000/evaluate-retry',
            { questionId: 'q1', mode: 'text' },
            { wo_notify: true }
        );
    });

    it('на обычной ошибке перезапускает оценку как есть, с аудио', async () => {
        render(<MockInterviewResults interview={interviewWith({ questionId: 'q1', status: 'errored' })}/>);
        await act(async () => { fireEvent.click(screen.getByText('retry')); });
        expect(global.http.post).toHaveBeenCalledWith(
            '/mock-interview/1000/evaluate-retry',
            { questionId: 'q1' },
            { wo_notify: true }
        );
    });
});
