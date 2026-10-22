import React from 'react';
import { render } from '@testing-library/react';
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
});
