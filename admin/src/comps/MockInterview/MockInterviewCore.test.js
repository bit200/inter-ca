import React from 'react';
import { render, waitFor, act, fireEvent } from '@testing-library/react';
import MockInterviewCore from './MockInterviewCore';
import { isAttemptInterrupted } from './components/attemptInterrupted';

jest.mock('../../libs/sse/sse', () => ({ subscribe: () => () => {} }));
jest.mock('./components/MockInterviewIframe', () => ({ onClose, onComplete }) => (
    <div>
        iframe
        <button onClick={onClose}>close-iframe</button>
        <button onClick={() => onComplete({ interrupted: false })}>complete-iframe</button>
        <button onClick={() => onComplete({ interrupted: true })}>interrupt-iframe</button>
    </div>
));
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

// Собеседование прошло, но PUT status: 'completed' не успел уйти - попытка
// осталась 'started'. Экран верил статусу и вместо результатов показывал
// карточку старта, поэтому оценка была недоступна.
describe('MockInterviewCore застрявшая в "Начато" попытка', () => {
    test('с готовым диалогом открывается результатами, а не карточкой старта', async () => {
        const stuck = { ...attempt(1, 'started'), turns: [{ question_id: 'q1' }] };
        const post = setupHttp(stuck, [stuck]);

        const { findByText, queryByTestId } = render(<MockInterviewCore attemptId={1}/>);

        expect(await findByText('results')).toBeInTheDocument();
        expect(queryByTestId('mock-interview-start-card')).not.toBeInTheDocument();
        expect(post).not.toHaveBeenCalled();
    });
});


// Закрытие оверлея раньше не трогало статус попытки, и она висела в "Начато"
// до фоновой догоняющей проверки (две минуты порога + минута тика). Теперь
// клиент сам зовёт sync, который спрашивает меш и отдаёт актуальную запись.
describe('MockInterviewCore синхронизация попытки при выходе из интервью', () => {
    const setupStarted = (syncResult) => {
        const item = attempt(1, 'draft');
        const post = jest.fn((url) => {
            if (url === '/mock-interview/my-list/1/embed-session') {
                return Promise.resolve({ sessionId: 's-1', embedUrl: 'https://mesh/e/1' });
            }
            if (url === '/mock-interview/my-list/1/sync') return Promise.resolve(syncResult);
            return Promise.resolve({});
        });
        global.http = {
            get: jest.fn((url) => Promise.resolve(
                url === '/mock-interview/my-list' ? { items: [item] } : item
            )),
            post,
            put: jest.fn(() => Promise.resolve({})),
        };
        global.notify = { warning: () => {} };
        return post;
    };

    test('закрытие окна интервью зовёт sync и показывает пришедшие результаты', async () => {
        const closed = { ...attempt(1, 'completed'), turns: [{ question_id: 'q1' }] };
        const post = setupStarted(closed);

        const { findByText } = render(<MockInterviewCore attemptId={1}/>);
        const closeBtn = await findByText('close-iframe');
        await act(async () => { closeBtn.click(); });

        await waitFor(() => expect(post).toHaveBeenCalledWith(
            '/mock-interview/my-list/1/sync', {}, { wo_notify: true }
        ));
        expect(await findByText('results')).toBeInTheDocument();
    });

    test('завершение интервью тоже синхронизирует попытку - PUT мог не дойти', async () => {
        const post = setupStarted(attempt(1, 'completed'));

        const { findByText } = render(<MockInterviewCore attemptId={1}/>);
        const completeBtn = await findByText('complete-iframe');
        await act(async () => { completeBtn.click(); });

        await waitFor(() => expect(post).toHaveBeenCalledWith(
            '/mock-interview/my-list/1/sync', {}, { wo_notify: true }
        ));
    });

    test('упавший sync не показывается кандидату', async () => {
        const item = attempt(1, 'draft');
        const post = jest.fn((url) => {
            if (url === '/mock-interview/my-list/1/embed-session') {
                return Promise.resolve({ sessionId: 's-1', embedUrl: 'https://mesh/e/1' });
            }
            if (url === '/mock-interview/my-list/1/sync') return Promise.reject(new Error('mesh down'));
            return Promise.resolve({});
        });
        const warning = jest.fn();
        global.http = {
            get: jest.fn((url) => Promise.resolve(
                url === '/mock-interview/my-list' ? { items: [item] } : item
            )),
            post,
            put: jest.fn(() => Promise.resolve({})),
        };
        global.notify = { warning };

        const { findByText } = render(<MockInterviewCore attemptId={1}/>);
        const closeBtn = await findByText('close-iframe');
        await act(async () => { closeBtn.click(); });

        await waitFor(() => expect(post).toHaveBeenCalledWith(
            '/mock-interview/my-list/1/sync', {}, { wo_notify: true }
        ));
        await act(async () => { await new Promise(r => setTimeout(r, 20)); });
        expect(warning).not.toHaveBeenCalled();
    });
});


// Прерванное интервью видно только в момент закрытия окна - дальше попытка с
// двумя ответами неотличима от честно пройденной, поэтому признак уходит на
// бэкенд вместе со статусом и остаётся в локальной памяти устройства.
describe('MockInterviewCore - завершение прерванного интервью', () => {
    test('запоминает выход посреди интервью на попытке', async () => {
        const item = attempt(1, 'draft');
        setupHttp(item, [item]);
        window.localStorage.clear();

        const { findByText } = render(<MockInterviewCore attemptId={1}/>);
        const btn = await findByText('interrupt-iframe');
        await act(async () => { fireEvent.click(btn); });

        expect(global.http.put).toHaveBeenCalledWith(
            '/mock-interview/my-list/1',
            { status: 'completed', interrupted: true },
            { wo_notify: true }
        );
        expect(isAttemptInterrupted({ _id: 1 })).toBe(true);
    });

    test('интервью, доведённое до конца, прерванным не помечает', async () => {
        const item = attempt(1, 'draft');
        setupHttp(item, [item]);
        window.localStorage.clear();

        const { findByText } = render(<MockInterviewCore attemptId={1}/>);
        const btn = await findByText('complete-iframe');
        await act(async () => { fireEvent.click(btn); });

        expect(global.http.put).toHaveBeenCalledWith(
            '/mock-interview/my-list/1',
            { status: 'completed', interrupted: false },
            { wo_notify: true }
        );
        expect(isAttemptInterrupted({ _id: 1 })).toBe(false);
    });
});
