import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import MockInterviewCore from './MockInterviewCore';

jest.mock('../../libs/sse/sse', () => ({ subscribe: () => () => {} }));
jest.mock('./components/MockInterviewIframe', () => () => <div>iframe</div>);
jest.mock('./components/MockInterviewResults', () => () => <div>results</div>);

const attempt = (id, status) => ({ _id: id, interviewId: 'int-1', status, cd: '2026-09-0' + id, turns: [], evaluate: [] });

// Автостарт нужен только на первой попытке: с несколькими попытками человек
// приходит на экран за историей, и самозапуск повторного интервью тут лишний.
const setupHttp = (item, historyItems) => {
    const post = jest.fn(() => Promise.resolve({}));
    global.http = {
        get: jest.fn((url) => Promise.resolve(
            url === '/mock-interview/my-list' ? { items: historyItems } : item
        )),
        post,
        put: jest.fn(() => Promise.resolve({})),
    };
    global.notify = { warning: () => {} };
    return post;
};

beforeEach(() => { global.t = () => null; });

describe('MockInterviewCore автостарт попытки', () => {
    test('единственную незавершённую попытку запускает сам', async () => {
        const item = attempt(1, 'draft');
        const post = setupHttp(item, [item]);

        render(<MockInterviewCore attemptId={1}/>);

        await waitFor(() => expect(post).toHaveBeenCalledWith(
            '/mock-interview/my-list/1/reserve', {}, { wo_notify: true }
        ));
    });

    test('при нескольких попытках повторное интервью само не запускается', async () => {
        const item = attempt(2, 'draft');
        const post = setupHttp(item, [item, attempt(1, 'evaluated')]);

        render(<MockInterviewCore attemptId={2}/>);

        await waitFor(() => expect(global.http.get).toHaveBeenCalledWith(
            '/mock-interview/my-list', { filter: { interviewId: 'int-1' } }, { wo_notify: true }
        ));
        await act(async () => { await new Promise(r => setTimeout(r, 50)); });
        expect(post).not.toHaveBeenCalled();
    });
});
