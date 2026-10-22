import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import TaskEvaluationDetail from './TaskEvaluationDetail';

describe('TaskEvaluationDetail: страница оценки задачи модуля', () => {
    it('показывает название, балл и разбор ИИ-проверки', async () => {
        global.t = (key) => key;
        global.http = { get: jest.fn(() => Promise.resolve({ items: [
            { _id: 'm', question: 5, status: 'done', title: 'Фибоначчи', score: 8,
              result: { verdict: 'pass', summary: 'Решение верное', scores: { correctness: 9 }, reasons: {} } },
        ] })) };
        const utils = render(
            <MemoryRouter initialEntries={['/evaluations/task/m']}>
                <Routes><Route path="/evaluations/task/:id" element={<TaskEvaluationDetail/>}/></Routes>
            </MemoryRouter>
        );
        expect((await utils.findByTestId('evaluation-hero')).textContent).toContain('Фибоначчи');
        expect(utils.getByTestId('exam-ai-review').textContent).toContain('Решение верное');
    });

    it('без оценки показывает кнопку «Получить ИИ-оценку» и запускает проверку', async () => {
        global.t = (key) => key;
        global.http = {
            get: jest.fn(() => Promise.resolve({ items: [
                { _id: '1078', question: 5, status: 'done', title: 'Фибоначчи', score: null,
                  result: { verdict: 'needs_review', scores: { correctness: null } } },
            ] })),
            post: jest.fn(() => Promise.resolve({})),
        };
        const utils = render(
            <MemoryRouter initialEntries={['/evaluations/task/1078']}>
                <Routes><Route path="/evaluations/task/:id" element={<TaskEvaluationDetail/>}/></Routes>
            </MemoryRouter>
        );
        fireEvent.click(await utils.findByTestId('exam-ai-review-start'));
        await waitFor(() => expect(global.http.post).toHaveBeenCalledWith('/my-code-review-start', { submissionId: 1078 }, { wo_notify: true }));
        await waitFor(() => expect(utils.queryByTestId('exam-ai-review-start')).toBeNull());
    });

    it('при готовой оценке кнопки нет', async () => {
        global.t = (key) => key;
        global.http = { get: jest.fn(() => Promise.resolve({ items: [
            { _id: 'm', question: 5, status: 'done', title: 'X', score: 8, result: { scores: { correctness: 9 } } },
        ] })) };
        const utils = render(
            <MemoryRouter initialEntries={['/evaluations/task/m']}>
                <Routes><Route path="/evaluations/task/:id" element={<TaskEvaluationDetail/>}/></Routes>
            </MemoryRouter>
        );
        await utils.findByTestId('exam-ai-review');
        expect(utils.queryByTestId('exam-ai-review-start')).toBeNull();
    });
});
