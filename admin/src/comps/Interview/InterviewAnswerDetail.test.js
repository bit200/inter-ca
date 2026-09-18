import React from 'react';
import fs from 'fs';
import path from 'path';
import {fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter, Routes, Route} from 'react-router-dom';
import InterviewAnswerDetail from './InterviewAnswerDetail';
import InterviewAnswerModal from './InterviewAnswer/InterviewAnswerModal';
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

const mockHttp = () => {
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
};

const renderPage = (path) => {
    mockHttp();
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

describe('InterviewAnswerModal: разбор ответа интервью в модалке тем же набором компонентов', () => {
    it('без роутера показывает тот же контент, что страница, и закрывается крестиком', async () => {
        mockHttp();
        const onClose = jest.fn();
        render(<InterviewAnswerModal interviewId={1000} number={2} onClose={onClose}/>);

        expect(await screen.findByText('Вопрос 2 из интервью')).toBeInTheDocument();
        expect(screen.getByTestId('interview-answer-view')).toBeInTheDocument();
        expect(screen.getByText('Ответ не засчитан')).toBeInTheDocument();
        expect(screen.getByText('Пока нет, только теория')).toBeInTheDocument();
        expect(screen.queryByRole('link', {name: '← Разбор диалога'})).not.toBeInTheDocument();

        fireEvent.click(document.querySelector('.iconoir-xmark'));
        expect(onClose).toHaveBeenCalled();
    });

    it('модалка во весь экран без белой полосы над разбором и с крупным крестиком', async () => {
        mockHttp();
        render(<InterviewAnswerModal interviewId={1000} number={2} onClose={jest.fn()}/>);
        await screen.findByTestId('interview-answer-view');
        expect(document.querySelector('.ReactModal__Content')).toHaveClass('answer-modal');

        const css = fs.readFileSync(path.join(__dirname, '../../libs/MyModal/myModal.css'), 'utf8');
        const rule = selector => (css.match(new RegExp(selector.replace(/[.>]/g, m => '\\' + m) + '\\s*\\{([^}]*)\\}')) || [])[1] || '';
        expect(rule('.answer-modal > .card')).toMatch(/background:\s*var\(--bs-body-bg\)/);
        expect(parseInt((rule('.answer-modal .mmodal > .iconoir-xmark').match(/font-size:\s*(\d+)px/) || [])[1], 10)).toBeGreaterThanOrEqual(20);
        const xmark = rule('.answer-modal .mmodal > .iconoir-xmark');
        expect(xmark).toMatch(/position:\s*absolute/);
        // Крестик вынесен к верхней кромке карточки (top отрицательный) и прижат к правому краю.
        expect(parseInt((xmark.match(/top:\s*(-?\d+)px/) || [])[1], 10)).toBe(-19);
        expect(parseInt((xmark.match(/right:\s*(-?\d+)px/) || [])[1], 10)).toBe(5);
        expect(xmark).toMatch(/margin:\s*0;/);
    });

    it('без номера вопроса модалка закрыта и ничего не грузит', () => {
        mockHttp();
        render(<InterviewAnswerModal interviewId={1000} number={null}/>);
        expect(screen.queryByTestId('interview-answer-view')).not.toBeInTheDocument();
        expect(global.http.get).not.toHaveBeenCalledWith('/my-interview/1000/answers-evaluation', {}, {wo_notify: true});
    });
});
