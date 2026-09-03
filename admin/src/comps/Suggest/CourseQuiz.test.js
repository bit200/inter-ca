import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

// Компонент тянет весь учебный поток (квиз, тренажёр, редактор) - для проверки
// одного колбэка "интервью завершено" всё это заменяем заглушками.
jest.mock('./QuestionDetails', () => () => null);
jest.mock('./MdPreview', () => () => null);
jest.mock('@uiw/react-md-editor', () => () => null);
jest.mock('./QuizTraining', () => () => null);
jest.mock('./RunQuiz', () => () => null);
jest.mock('./SuggestionItem', () => ({ generateSuggestion: () => null }));
jest.mock('./CustomStorage', () => ({ getId: () => 1 }));
jest.mock('../TrainMethods/Train', () => () => null);
jest.mock('../TrainMethods/TrainPageCourse', () => () => <div>quiz</div>);
jest.mock('../Quiz', () => () => null);
jest.mock('../RunExam', () => ({ getDefaultQuizTime: () => 0, getStartTimers: () => [] }));
jest.mock('react-router-dom', () => ({
    Link: ({ children }) => <a>{children}</a>,
    useNavigate: () => jest.fn(),
}));
jest.mock('../../libs/Button', () => ({ onClick, children }) => (
    <button onClick={() => onClick(() => {})}>{children}</button>
));
jest.mock('../../libs/MyModal', () => ({ isOpen, children }) => (isOpen ? <div>{children}</div> : null));
jest.mock('../MockInterview/MockInterviewCore', () => ({ onComplete }) => (
    <button onClick={() => onComplete(777)}>завершить интервью</button>
));

import CourseQuiz from './CourseQuiz';

describe('CourseQuiz - финальное интервью закрывает модуль наравне с квизом', () => {
    let onSuccess;

    beforeEach(() => {
        global.t = (key) => key;
        onSuccess = jest.fn();
        global.http = {
            get: jest.fn(() => Promise.resolve({ quizes: [{ _id: 1 }], pubQuizes: [{ _id: 1 }] })),
            post: jest.fn((url) => Promise.resolve(
                url === '/mock-interview/my-list' ? { item: { _id: 55 } } : {}
            )),
        };
        global.notify = { warning: jest.fn(), error: jest.fn(), success: jest.fn() };
        window.notify = global.notify;
    });

    async function openInterviewTab() {
        render(<CourseQuiz
            isLastModule={true}
            interviewId={9}
            moduleId={500}
            courseUserId={42}
            onAction={jest.fn()}
            onSuccess={onSuccess}
        />);
        await act(async () => {});
        await act(async () => { fireEvent.click(screen.getByText('checkKnowledge')); });
        await waitFor(() => screen.getByText('завершить интервью'));
    }

    it('после завершения интервью пишет модулю тот же результат "ok", что и сданный квиз', async () => {
        await openInterviewTab();
        await act(async () => { fireEvent.click(screen.getByText('завершить интервью')); });

        expect(global.http.post).toHaveBeenCalledWith(
            '/save-course-module-results',
            expect.objectContaining({ courseModule: 500, courseUserId: 42, status: 'ok', quizPerc: 100 })
        );
    });

    it('после завершения интервью сообщает наверх об успехе, чтобы обновилась mHistory', async () => {
        await openInterviewTab();
        await act(async () => { fireEvent.click(screen.getByText('завершить интервью')); });

        expect(onSuccess).toHaveBeenCalledWith({ status: 'ok' });
    });
});
