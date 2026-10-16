import {act, render, screen} from '@testing-library/react';
import {CodeReviewBlock, CodeReviewDone} from './CodeReviewBlock';
import sse from 'libs/sse/sse';

jest.mock('libs/sse/sse', () => ({subscribe: jest.fn()}));

const DONE = {
    status: 'done',
    result: {
        verdict: 'pass', tests: {passed: 4, total: 4},
        scores: {correctness: 9, optimality: 5, readability: 2, process: 8},
        hints: ['Можно без сортировки'],
    },
};

let push;
const unsubscribe = jest.fn();

beforeEach(() => {
    sse.subscribe.mockReset();
    unsubscribe.mockReset();
    sse.subscribe.mockImplementation((path, cb) => { push = cb; return unsubscribe; });
});

function mockSubmission(aiReview) {
    global.http = {get: jest.fn(() => Promise.resolve({_id: 7, aiReview}))};
}

describe('Разбор решения (CodeReviewBlock)', () => {
    test('pending: «ИИ проверяет решение…», подписка по SSE; done по SSE показывает разбор и закрывает подписку', async () => {
        mockSubmission({status: 'pending'});
        render(<CodeReviewBlock submissionId={7}/>);
        expect(await screen.findByText(/ИИ проверяет решение/)).toBeTruthy();
        expect(sse.subscribe).toHaveBeenCalledWith('/code-review-events/7', expect.any(Function));

        act(() => push(DONE));
        expect(screen.getByText('Все тесты пройдены')).toBeTruthy();
        expect(screen.getByText('4 из 4')).toBeTruthy();
        expect(screen.getByText('Можно без сортировки')).toBeTruthy();
        expect(screen.getByText('Корректность')).toBeTruthy();
        expect(screen.queryByText(/ИИ проверяет/)).toBeNull();
        expect(unsubscribe).toHaveBeenCalled();
    });

    test('processing тоже ждёт; уже готовая проверка рисуется без подписки', async () => {
        mockSubmission({status: 'processing'});
        const {unmount} = render(<CodeReviewBlock submissionId={7}/>);
        expect(await screen.findByText(/ИИ проверяет решение/)).toBeTruthy();
        unmount();
        expect(unsubscribe).toHaveBeenCalled();

        sse.subscribe.mockClear();
        mockSubmission(DONE);
        render(<CodeReviewBlock submissionId={7}/>);
        expect(await screen.findByText('Все тесты пройдены')).toBeTruthy();
        expect(sse.subscribe).not.toHaveBeenCalled();
    });

    test('done: fail по тестам, summary и needsHumanReview', () => {
        render(<CodeReviewDone result={{
            verdict: 'fail', tests: {passed: 1, total: 3}, summary: 'Не учтён пустой массив',
            needsHumanReview: true, scores: {correctness: 3}, reasons: {correctness: 'падает на []'},
        }}/>);
        expect(screen.getByText('Тесты не пройдены')).toBeTruthy();
        expect(screen.getByText('Не учтён пустой массив')).toBeTruthy();
        expect(screen.getByText('Решение передано ментору')).toBeTruthy();
        expect(screen.getByText('падает на []')).toBeTruthy();
    });

    test('error: блок скрыт, «ошибки ИИ» кандидату нет', async () => {
        mockSubmission({status: 'error'});
        const {container} = render(<CodeReviewBlock submissionId={7}/>);
        await act(async () => {});
        expect(container.textContent).toBe('');
    });

    test('экзамен: только «решение отправлено», запросов и подписки нет', async () => {
        mockSubmission(DONE);
        render(<CodeReviewBlock submissionId={7} isExam={true}/>);
        expect(screen.getByText('Решение отправлено')).toBeTruthy();
        await act(async () => {});
        expect(global.http.get).not.toHaveBeenCalled();
        expect(sse.subscribe).not.toHaveBeenCalled();
        expect(screen.queryByText('Разбор решения')).toBeNull();
    });

    test('без submissionId ничего не рисуется', () => {
        const {container} = render(<CodeReviewBlock submissionId={null}/>);
        expect(container.textContent).toBe('');
    });
});
