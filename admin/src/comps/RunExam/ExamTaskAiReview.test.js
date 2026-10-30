import React from 'react';
import {render, screen, act, fireEvent} from '@testing-library/react';
import ExamTaskAiReview, {useExamAiReviews, buildTypingTimeline} from './ExamTaskAiReview';

let done = {
    question: 11, status: 'done',
    result: {
        verdict: 'pass', tests: {passed: 2, total: 2},
        scores: {correctness: 10, optimality: 2, readability: 9},
        reasons: {correctness: 'Перебирает все пары', optimality: 'O(n²), можно за O(n)', readability: 'Понятно'},
        summary: 'Решение верное, но медленное.',
    },
};

function Screen({examId, question}) {
    let reviews = useExamAiReviews(examId);
    return <ExamTaskAiReview review={reviews.find(it => it.question === question)}/>;
}

describe('ИИ-проверка решения на экране сданного экзамена', () => {
    beforeEach(() => {
        global.t = (key) => key;
    });

    test('показывает оценки и разбор своей задачи, без строки про автотесты', async () => {
        global.http = {get: jest.fn(() => Promise.resolve({reviews: [done, {question: 12, status: 'pending'}]}))};
        await act(async () => {
            render(<Screen examId={7} question={11}/>);
        });
        expect(global.http.get).toHaveBeenCalledWith('/my-exam-code-reviews', {examId: 7});
        expect(screen.queryByText(/aiReviewTests/)).not.toBeInTheDocument();
        expect(screen.getByText('O(n²), можно за O(n)')).toBeInTheDocument();
        expect(screen.getByText('Решение верное, но медленное.')).toBeInTheDocument();
    });

    test('у критерия «Процесс решения» есть пояснение, как он оценивается', async () => {
        global.http = {get: jest.fn(() => Promise.resolve({reviews: [{...done, result: {...done.result, scores: {...done.result.scores, process: 5}, reasons: {process: 'История набора отсутствует.'}}}]}))};
        await act(async () => {
            render(<Screen examId={7} question={11}/>);
        });
        expect(screen.getByTestId('exam-ai-review-process-note')).toHaveTextContent('aiReviewProcessNote');
    });

    test('пока проверка идёт - сообщение и опрос, затем результат', async () => {
        jest.useFakeTimers();
        global.http = {
            get: jest.fn()
                .mockImplementationOnce(() => Promise.resolve({reviews: [{question: 11, status: 'processing'}]}))
                .mockImplementation(() => Promise.resolve({reviews: [done]})),
        };
        await act(async () => {
            render(<Screen examId={7} question={11}/>);
        });
        expect(screen.getByText('aiReviewPending')).toBeInTheDocument();
        await act(async () => {
            jest.advanceTimersByTime(5000);
        });
        expect(screen.getByText('Решение верное, но медленное.')).toBeInTheDocument();
        jest.useRealTimers();
    });

    test('пустое решение и сбой проверки - понятным текстом', () => {
        let {rerender} = render(<ExamTaskAiReview review={{question: 11, status: 'error', errorCode: 'empty_code'}}/>);
        expect(screen.getByText('aiReviewEmptyCode')).toBeInTheDocument();
        rerender(<ExamTaskAiReview review={{question: 11, status: 'error', errorCode: 'LLM_FAILED'}}/>);
        expect(screen.getByText('aiReviewFailed')).toBeInTheDocument();
    });

    test('задача без проверки (logreader, старый экзамен) - блока нет', () => {
        render(<ExamTaskAiReview review={undefined}/>);
        expect(screen.queryByTestId('exam-ai-review')).toBeNull();
    });

    test('рекомендации по критериям, вкладки и пометка про ИИ', () => {
        let review = {...done, result: {...done.result, suggestions: {optimality: 'Используйте Map вместо двойного цикла'}}};
        render(<ExamTaskAiReview review={review}/>);
        expect(screen.getByText('Используйте Map вместо двойного цикла')).toBeInTheDocument();
        expect(screen.getAllByTestId('exam-ai-review-suggestion')).toHaveLength(1);
        expect(screen.getByTestId('exam-ai-review-note')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('tab', {name: 'aiReviewReadability'}));
        expect(screen.queryByTestId('exam-ai-review-suggestion')).toBeNull();
        expect(screen.getByText('Понятно')).toBeInTheDocument();
    });
});

describe('процесс решения: плашки и таймлайн', () => {
    beforeEach(() => {
        global.t = (key) => key;
    });
    function withTyping(typing, process = null) {
        return {...done, result: {...done.result, scores: {...done.result.scores, process}, typing}};
    }

    test.each([
        ['none', 'aiReviewProcessNone'],
        ['pasted_whole', 'aiReviewProcessPastedWhole'],
        ['replaced_after_tests', 'aiReviewProcessReplaced'],
        ['partial_paste', 'aiReviewProcessPartial'],
    ])('плашка для режима %s', (mode, text) => {
        render(<ExamTaskAiReview review={withTyping({mode, typedShare: 0.6, pastes: [{time: 362, added: 1240, replacedShare: 0.9}], runs: []})}/>);
        let badge = screen.getByTestId('exam-ai-review-process-badge');
        expect(badge).toHaveAttribute('data-mode', mode);
        expect(badge).toHaveTextContent(text);
        if (mode === 'pasted_whole') expect(badge).toHaveTextContent('aiReviewProcessManual');
    });

    test('режим own - плашки нет, null-оценка - «—»', () => {
        render(<ExamTaskAiReview review={withTyping({mode: 'own', typedShare: 1, pastes: [], runs: []})}/>);
        expect(screen.queryByTestId('exam-ai-review-process-badge')).toBeNull();
        expect(screen.getAllByText('—').length).toBeGreaterThan(0);
        expect(screen.queryByText('5')).toBeNull();
    });

    test('таймлайн рисует прогоны и вставки', () => {
        let typing = {mode: 'partial_paste', typedShare: 0.5, pastes: [{time: 100, added: 300, replacedShare: 0}, {time: 200, added: 900, replacedShare: 0.9}],
            runs: [{time: 50, passed: 1, total: 3}, {time: 400, passed: 3, total: 3}]};
        render(<ExamTaskAiReview review={withTyping(typing)}/>);
        expect(screen.getAllByTestId('exam-ai-review-timeline-run')).toHaveLength(2);
        expect(screen.getAllByTestId('exam-ai-review-timeline-run')[0]).toHaveClass('fail');
        expect(screen.getAllByTestId('exam-ai-review-timeline-run')[1]).toHaveClass('ok');
        expect(screen.getAllByTestId('exam-ai-review-timeline-paste')).toHaveLength(2);
        let tl = buildTypingTimeline(typing);
        expect(tl.max).toBe(400);
        expect(tl.pastes[1].label).toBe('aiReviewTimelineReplaced');
        expect(tl.pastes[0].label).toBe('aiReviewTimelinePaste');
    });
});

describe('вёрстка блока ИИ-проверки', () => {
    test('у корневого блока нет рамки и внутренних отступов', () => {
        const fs = require('fs');
        const scss = fs.readFileSync(require('path').join(__dirname, 'examTaskAiReview.scss'), 'utf8');
        const root = scss.slice(0, scss.indexOf('&-title'));
        expect(root).not.toMatch(/border/);
        expect(root).not.toMatch(/padding/);
    });
});
