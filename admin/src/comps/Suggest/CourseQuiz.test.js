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
jest.mock('../TrainMethods/TrainPageCourse', () => () => <div>квиз</div>);
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
jest.mock('../MockInterview/components/MockInterviewIframe', () => ({ interview, onComplete }) => (
    <div>
        <span>iframe: {interview.embedUrl}</span>
        <button onClick={() => onComplete()}>завершить интервью</button>
    </div>
));
jest.mock('../MockInterview/components/CourseInterviewHistory', () => ({ interviewId }) => (
    <div>история попыток {interviewId}</div>
));

import CourseQuiz from './CourseQuiz';

describe('CourseQuiz - финальная проверка знаний через мок-интервью', () => {
    let onSuccess;
    let postFail;

    beforeEach(() => {
        global.t = (key) => key;
        onSuccess = jest.fn();
        postFail = null;
        global.http = {
            get: jest.fn(() => Promise.resolve({ quizes: [{ _id: 1 }], pubQuizes: [{ _id: 1 }] })),
            put: jest.fn(() => Promise.resolve({})),
            post: jest.fn((url) => {
                if (postFail && postFail(url)) {
                    return Promise.reject({ error: 'busy' });
                }
                if (url === '/mock-interview/my-list') {
                    return Promise.resolve({ item: { _id: 55, name: 'Интервью' } });
                }
                if (/embed-session$/.test(url)) {
                    return Promise.resolve({ embedUrl: 'https://itk.live/e/abc', sessionId: 's1' });
                }
                return Promise.resolve({});
            }),
        };
        global.notify = { warning: jest.fn(), error: jest.fn(), success: jest.fn() };
        window.notify = global.notify;
    });

    async function renderQuiz() {
        render(<CourseQuiz
            isLastModule={true}
            interviewId={9}
            moduleId={500}
            courseUserId={42}
            onAction={jest.fn()}
            onSuccess={onSuccess}
        />);
        await act(async () => {});
    }

    async function clickCheck() {
        await act(async () => { fireEvent.click(screen.getByText('checkKnowledge')); });
    }

    it('по кнопке "Проверить знания" сразу открывает iframe интервью, без модалки с квизом', async () => {
        await renderQuiz();
        await clickCheck();

        await waitFor(() => screen.getByText('iframe: https://itk.live/e/abc'));
        expect(screen.queryByText('квиз')).toBeNull();
    });

    it('если интервью не удалось запустить, показывает модалку с квизом', async () => {
        postFail = (url) => /reserve$/.test(url);
        await renderQuiz();
        await clickCheck();

        await waitFor(() => screen.getByText('квиз'));
        expect(screen.queryByText(/^iframe:/)).toBeNull();
        expect(global.notify.warning).toHaveBeenCalled();
    });

    it('историю попыток показывает блоком на самой странице, а не по нажатию кнопки', async () => {
        await renderQuiz();

        expect(screen.getByText('история попыток 9')).toBeInTheDocument();
    });

    it('после завершения интервью пишет модулю тот же результат "ok", что и сданный квиз', async () => {
        await renderQuiz();
        await clickCheck();
        await waitFor(() => screen.getByText('завершить интервью'));
        await act(async () => { fireEvent.click(screen.getByText('завершить интервью')); });

        expect(global.http.post).toHaveBeenCalledWith(
            '/save-course-module-results',
            expect.objectContaining({ courseModule: 500, courseUserId: 42, status: 'ok', quizPerc: 100 })
        );
    });

    it('после завершения интервью сообщает наверх об успехе, чтобы обновилась mHistory', async () => {
        await renderQuiz();
        await clickCheck();
        await waitFor(() => screen.getByText('завершить интервью'));
        await act(async () => { fireEvent.click(screen.getByText('завершить интервью')); });

        expect(onSuccess).toHaveBeenCalledWith({ status: 'ok' });
    });
});
