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
jest.mock('../TrainMethods/TrainPageCourse', () => ({ onChange, onResult }) => <div>квиз
    <button onClick={() => { onChange({ history: [] }); onResult(); }}>сдать квиз на 100</button>
</div>);
jest.mock('../VsTask/vsTask', () => ({ calcQuizPerc: () => ({ quizPerc: 100, total: 1 }), countVsQuizes: () => 0 }));
jest.mock('../Quiz', () => () => null);
jest.mock('../RunExam', () => ({ getDefaultQuizTime: () => 0, getStartTimers: () => [] }));
jest.mock('react-router-dom', () => ({
    Link: ({ children }) => <a>{children}</a>,
    useNavigate: () => jest.fn(),
}));
jest.mock('../../libs/Button', () => ({ onClick, children }) => (
    <button onClick={() => onClick(() => {})}>{children}</button>
));
// Esc/клик мимо модалки: как настоящий MyModal, сначала спрашиваем beforeClose
jest.mock('../../libs/MyModal', () => ({ isOpen, children, onClose, beforeClose }) => (isOpen ? <div>
    {children}
    <button onClick={() => { if (!beforeClose || beforeClose() !== false) onClose(); }}>esc</button>
</div> : null));
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
    let historyItems;

    beforeEach(() => {
        global.t = (key) => key;
        onSuccess = jest.fn();
        postFail = null;
        historyItems = [];
        global.http = {
            get: jest.fn((url) => {
                if (url === '/mock-interview/my-list') {
                    return Promise.resolve({ items: historyItems });
                }
                return Promise.resolve({ quizes: [{ _id: 1 }], pubQuizes: [{ _id: 1 }] });
            }),
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

    it('продолжает незавершённую попытку интервью, а не создаёт новую', async () => {
        historyItems = [
            { _id: 70, status: 'started', cd: '2026-09-01T10:00:00Z' },
            { _id: 71, status: 'completed', cd: '2026-09-02T10:00:00Z' },
        ];
        await renderQuiz();
        await clickCheck();

        await waitFor(() => screen.getByText('iframe: https://itk.live/e/abc'));
        expect(global.http.post).not.toHaveBeenCalledWith('/mock-interview/my-list', expect.anything(), expect.anything());
        expect(global.http.post).toHaveBeenCalledWith(
            '/mock-interview/my-list/70/reserve', {}, { wo_notify: true }
        );
    });

    it('если незавершённых попыток нет, заводит новую', async () => {
        historyItems = [{ _id: 71, status: 'completed', cd: '2026-09-02T10:00:00Z' }];
        await renderQuiz();
        await clickCheck();

        await waitFor(() => screen.getByText('iframe: https://itk.live/e/abc'));
        expect(global.http.post).toHaveBeenCalledWith(
            '/mock-interview/my-list', { interviewId: 9 }, { wo_notify: true }
        );
        expect(global.http.post).toHaveBeenCalledWith(
            '/mock-interview/my-list/55/reserve', {}, { wo_notify: true }
        );
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

    it('после сданного квиза последнего модуля пишет "Курс пройден" и даёт ссылку на ИИ оценку', async () => {
        render(<CourseQuiz isLastModule={true} moduleId={500} courseUserId={42}
                           onAction={jest.fn()} onSuccess={onSuccess} />);
        await act(async () => {});
        await clickCheck();
        await waitFor(() => screen.getByText('квиз'));
        await act(async () => { fireEvent.click(screen.getByText('сдать квиз на 100')); });

        expect(screen.getByTestId('course-completed')).toHaveTextContent('Курс пройден');
        expect(screen.getByText('Смотреть ИИ оценку')).toBeInTheDocument();
    });

    it('при сбое загрузки заданий показывает "Повторить", а не "Далее" и не засчитывает главу', async () => {
        let fail = true;
        global.http.get = jest.fn((url) => {
            if (url === '/load-quizes-by-module') {
                return fail ? Promise.reject(new Error('refused'))
                    : Promise.resolve({ quizes: [{ _id: 1 }], pubQuizes: [{ _id: 1 }] });
            }
            return Promise.resolve({ items: [] });
        });
        render(<CourseQuiz isLastModule={false} moduleId={500} courseUserId={42}
                           onAction={jest.fn()} onSuccess={onSuccess} />);
        await act(async () => {});

        expect(screen.queryByText('next')).toBeNull();
        expect(screen.queryByText('noCheckTasks')).toBeNull();
        expect(onSuccess).not.toHaveBeenCalled();

        fail = false;
        await act(async () => { fireEvent.click(screen.getByText(/Повторить/)); });
        expect(screen.getByText('checkKnowledge')).toBeTruthy();
        expect(screen.queryByText(/Повторить/)).toBeNull();
    });
});

describe('CourseQuiz - закрытие модалки посреди проверочного квиза', () => {
    beforeEach(() => {
        global.t = (key) => key;
        global.http = {
            get: jest.fn(() => Promise.resolve({ quizes: [{ _id: 1 }], pubQuizes: [{ _id: 1 }] })),
            put: jest.fn(() => Promise.resolve({})),
            post: jest.fn(() => Promise.resolve({})),
        };
    });

    async function openQuiz() {
        render(<CourseQuiz moduleId={500} onAction={jest.fn()} onSuccess={jest.fn()} />);
        await act(async () => {});
        await act(async () => { fireEvent.click(screen.getByText('checkKnowledge')); });
        await waitFor(() => screen.getByText('квиз'));
    }

    it('по Esc не закрывает квиз сразу, а просит подтверждение', async () => {
        await openQuiz();
        fireEvent.click(screen.getAllByText('esc')[0]);

        expect(screen.getByTestId('course-quiz-confirm-close')).toBeInTheDocument();
        expect(screen.getByText('квиз')).toBeInTheDocument();
    });

    it('"Продолжить квиз" оставляет квиз открытым', async () => {
        await openQuiz();
        fireEvent.click(screen.getAllByText('esc')[0]);
        await act(async () => { fireEvent.click(screen.getByText('Продолжить квиз')); });

        expect(screen.queryByTestId('course-quiz-confirm-close')).toBeNull();
        expect(screen.getByText('квиз')).toBeInTheDocument();
    });

    it('"Закрыть и выйти" закрывает квиз', async () => {
        await openQuiz();
        fireEvent.click(screen.getAllByText('esc')[0]);
        await act(async () => { fireEvent.click(screen.getByText('Закрыть и выйти')); });

        expect(screen.queryByText('квиз')).toBeNull();
        expect(screen.queryByTestId('course-quiz-confirm-close')).toBeNull();
    });
});

describe('CourseQuiz: уже пройденный итоговый тест', () => {
    beforeEach(() => {
        global.http = {
            get: jest.fn(() => Promise.resolve({ quizes: [{ _id: 1 }], pubQuizes: [{ _id: 1 }] })),
            put: jest.fn(() => Promise.resolve({})),
            post: jest.fn(() => Promise.resolve({})),
        };
    });

    it('показывает, что курс пройден, и результат при повторном открытии', async () => {
        render(<CourseQuiz moduleId={500} isLastModule={true} moduleResult={{ status: 'ok', quizPerc: 92 }}
                           onAction={jest.fn()} onSuccess={jest.fn()} />);
        await act(async () => {});

        const block = screen.getByTestId('course-module-passed');
        expect(block).toHaveTextContent('Курс пройден!');
        expect(block).toHaveTextContent('92%');
        expect(screen.getByText('Смотреть ИИ оценку')).toBeInTheDocument();
    });

    it('не показывает «пройден» для не сданного модуля', async () => {
        render(<CourseQuiz moduleId={500} isLastModule={true} moduleResult={{ status: 'error', quizPerc: 40 }}
                           onAction={jest.fn()} onSuccess={jest.fn()} />);
        await act(async () => {});

        expect(screen.queryByTestId('course-module-passed')).toBeNull();
    });
});
