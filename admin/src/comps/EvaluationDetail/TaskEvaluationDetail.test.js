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

    it('если запуск оценки вернул ошибку (409), показывает её пользователю', async () => {
        global.t = (key) => key;
        global.http = {
            get: jest.fn(() => Promise.resolve({ items: [
                { _id: '1078', question: 5, status: 'done', title: 'X', score: null, result: { scores: {} } },
            ] })),
            post: jest.fn(() => Promise.reject({ msg: 'Оценка уже запущена' })),
        };
        const utils = render(
            <MemoryRouter initialEntries={['/evaluations/task/1078']}>
                <Routes><Route path="/evaluations/task/:id" element={<TaskEvaluationDetail/>}/></Routes>
            </MemoryRouter>
        );
        fireEvent.click(await utils.findByTestId('exam-ai-review-start'));
        expect((await utils.findByTestId('ai-review-start-error')).textContent).toBe('Оценка уже запущена');
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

describe('TaskEvaluationDetail: порядок блоков', () => {
    it('сверху описание и оценка куратора, затем метрики, затем решение', async () => {
        global.t = (key) => key;
        global.http = { get: jest.fn(() => Promise.resolve({ items: [
            { _id: 'm', question: 5, status: 'done', title: 'Фибоначчи', description: 'Верните n-е число', score: 8,
              mentorReview: { score: 6, comment: 'Добавь тесты', mentorName: 'sup_admin' },
              result: { verdict: 'pass', summary: 'Ок', scores: { correctness: 9, optimality: 7 }, reasons: {} } },
        ] })) };
        const utils = render(
            <MemoryRouter initialEntries={['/evaluations/task/m']}>
                <Routes><Route path="/evaluations/task/:id" element={<TaskEvaluationDetail/>}/></Routes>
            </MemoryRouter>
        );
        const hero = await utils.findByTestId('evaluation-hero');
        const mentor = utils.getByTestId('mentor-review');
        const strip = utils.getByTestId('evaluation-strip');
        const review = utils.getByTestId('exam-ai-review');
        expect(hero.textContent).toContain('Верните n-е число');
        expect(mentor.textContent).toContain('Добавь тесты');
        expect(utils.getAllByTestId('metric-breakdown-row')).toHaveLength(2);
        const before = (a, b) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
        expect(before(hero, mentor)).toBe(true);
        expect(before(mentor, strip)).toBe(true);
        expect(before(strip, review)).toBe(true);
    });
});

describe('TaskEvaluationDetail: решение ученика', () => {
    const open = async (item) => {
        global.t = (key) => key;
        global.http = { get: jest.fn(() => Promise.resolve({ items: [item] })) };
        const utils = render(
            <MemoryRouter initialEntries={['/evaluations/task/m']}>
                <Routes><Route path="/evaluations/task/:id" element={<TaskEvaluationDetail/>}/></Routes>
            </MemoryRouter>
        );
        await utils.findByTestId('exam-ai-review');
        return utils;
    };

    it('внизу страницы показывает код, который сдал ученик', async () => {
        const utils = await open({ _id: 'm', question: 5, status: 'done', title: 'X', score: 8,
            files: { '': 'const uniq = a => [...new Set(a)];' }, result: { scores: { correctness: 9 } } });
        const block = utils.getByTestId('student-solution');
        expect(utils.getByTestId('student-solution-code').textContent).toBe('const uniq = a => [...new Set(a)];');
        expect(block.textContent).toContain('Решение ученика');
        expect(!!(utils.getByTestId('exam-ai-review').compareDocumentPosition(block) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    });

    it('без кода блока нет', async () => {
        const utils = await open({ _id: 'm', question: 5, status: 'done', title: 'X', score: 8, result: { scores: {} } });
        expect(utils.queryByTestId('student-solution')).toBeNull();
    });
});

describe('TaskEvaluationDetail: критерии в общей оценке', () => {
    it('показывает все критерии, из которых посчитана общая оценка, включая «процесс»', async () => {
        global.t = (key) => key;
        global.http = { get: jest.fn(() => Promise.resolve({ items: [
            { _id: 'p', question: 5, status: 'done', title: 'X', score: 8.8,
              result: { verdict: 'pass', scores: { correctness: 10, optimality: 10, readability: 10, process: 5 }, reasons: {} } },
        ] })) };
        const utils = render(
            <MemoryRouter initialEntries={['/evaluations/task/p']}>
                <Routes><Route path="/evaluations/task/:id" element={<TaskEvaluationDetail/>}/></Routes>
            </MemoryRouter>
        );
        await utils.findByTestId('evaluation-strip');
        expect(utils.getAllByTestId('metric-breakdown-row')).toHaveLength(4);
        expect(utils.getByTestId('evaluation-strip').textContent).toContain('aiReviewProcess');
    });
});
