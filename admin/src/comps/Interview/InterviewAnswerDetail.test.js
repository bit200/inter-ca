import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter, Routes, Route} from 'react-router-dom';
import InterviewAnswerDetail from './InterviewAnswerDetail';
import {resetEvaluationReference} from './DialogAnalysis/answerBrief';

const answers = {answersEvaluation: {status: 'done', result: {blocks: [
    {technical: false, question: 'Как дела?', answer: 'Хорошо'},
    {technical: true, question: 'Был ли опыт с микрофронтендами?', answer: 'Пока нет', startMs: 698065, endMs: 712240, evaluate: {
        score: 2.8,
        question: 'Был ли опыт с микрофронтендами?',
        text: 'Пока нет, только теория',
        evaluation: {depth: {depth_score: 2}, errors: {is_critical: 1, errors: ['Не отличает микрофронтенды от микросервисов']}},
    }},
]}}};

const renderPage = (path) => {
    resetEvaluationReference();
    global.http = {
        get: jest.fn(url => Promise.resolve(
            url === '/my-interview/1000/answers-evaluation' ? answers
                : url === '/eval-metric-schemas' ? {items: [{key: 'evaluation.depth.depth_score', group: 'Глубина', min: 0, max: 10}]}
                : {items: []}
        )),
        post: jest.fn(() => Promise.resolve({explain: {summary: 'Опыта с микрофронтендами нет', components: [
            {name: 'depth', score: 2, verdict: 'Только теория', suggestion: 'Разберите пример Module Federation'},
        ]}})),
    };
    return render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route path="/interviews/:id/answers/:number" element={<InterviewAnswerDetail/>}/>
            </Routes>
        </MemoryRouter>
    );
};

describe('InterviewAnswerDetail: полная детализация технической оценки ответа из разбора диалога', () => {
    it('показывает вопрос по номеру, общий балл с показателями, ответ и критическую ошибку', async () => {
        renderPage('/interviews/1000/answers/2');

        expect(await screen.findByText('Вопрос 2 из интервью')).toBeInTheDocument();
        expect(screen.getAllByText('Был ли опыт с микрофронтендами?').length).toBeGreaterThan(0);
        expect(screen.getByText('Ответ не засчитан')).toBeInTheDocument();
        expect(screen.getByTestId('evaluate-score')).toHaveAttribute('data-score', '2.8');
        expect(await screen.findByText('Глубина')).toBeInTheDocument();
        expect(screen.getByText('Пока нет, только теория')).toBeInTheDocument();
        expect(screen.getByText('Не отличает микрофронтенды от микросервисов')).toBeInTheDocument();
        expect(screen.getByRole('link', {name: '← Разбор диалога'})).toHaveAttribute('href', '/interviews/1000?tab=dialog');
    });

    it('кнопка «Расшифровать оценку» запрашивает расшифровку этого вопроса и показывает вывод и разбор', async () => {
        renderPage('/interviews/1000/answers/2');

        fireEvent.click(await screen.findByTestId('evaluate-explain-button'));
        expect(global.http.post).toHaveBeenCalledWith('/my-interview/1000/answers-evaluation/2/explain', {}, {wo_notify: true});
        expect(await screen.findByText('Опыта с микрофронтендами нет')).toBeInTheDocument();
        expect(screen.getByText('Разберите пример Module Federation')).toBeInTheDocument();
        expect(screen.queryByTestId('evaluate-explain-button')).not.toBeInTheDocument();
    });

    it('сохранённая расшифровка показывается сразу, без кнопки', async () => {
        answers.answersEvaluation.result.blocks[1].explain = {summary: 'Уже расшифровано', components: []};
        renderPage('/interviews/1000/answers/2');
        expect(await screen.findByText('Уже расшифровано')).toBeInTheDocument();
        expect(screen.queryByTestId('evaluate-explain-button')).not.toBeInTheDocument();
        delete answers.answersEvaluation.result.blocks[1].explain;
    });

    it('несуществующий номер вопроса - понятное сообщение, а не пустая страница', async () => {
        renderPage('/interviews/1000/answers/9');
        expect(await screen.findByText(/Вопрос 9 не найден/)).toBeInTheDocument();
    });
});
