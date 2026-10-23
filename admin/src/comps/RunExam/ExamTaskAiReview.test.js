import React from 'react';
import {render, screen, act, fireEvent} from '@testing-library/react';
import ExamTaskAiReview, {useExamAiReviews} from './ExamTaskAiReview';

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

    test('показывает итог автотестов, оценки и разбор своей задачи', async () => {
        global.http = {get: jest.fn(() => Promise.resolve({reviews: [done, {question: 12, status: 'pending'}]}))};
        await act(async () => {
            render(<Screen examId={7} question={11}/>);
        });
        expect(global.http.get).toHaveBeenCalledWith('/my-exam-code-reviews', {examId: 7});
        expect(screen.getByText('aiReviewTestsPassed (2 / 2)')).toBeInTheDocument();
        expect(screen.getByText('O(n²), можно за O(n)')).toBeInTheDocument();
        expect(screen.getByText('Решение верное, но медленное.')).toBeInTheDocument();
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
