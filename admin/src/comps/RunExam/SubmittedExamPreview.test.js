import {render, screen} from '@testing-library/react';
import SubmittedExamPreview from './SubmittedExamPreview';

jest.mock('@uiw/react-md-editor', () => ({Markdown: ({source}) => <span>{source}</span>}));
jest.mock('../LazyEditor/LazyEditor', () => () => null);
jest.mock('../Suggest/LogsStarterPreview', () => () => null);
jest.mock('../Suggest/RenderQuizResults', () => () => null);
jest.mock('../MyImg', () => () => null);
jest.mock('./ExamTaskAiReview', () => ({__esModule: true, default: () => null, useExamAiReviews: () => []}));

beforeEach(() => {
    global.t = (key) => key;
    window.onRenderLeftMenu = () => {};
    global.env = {};
});

function renderPreview(submitDetails, exam = {}) {
    return render(<SubmittedExamPreview
        dbTasks={[{_id: 1, name: 'Задача A'}, {_id: 2, name: 'Задача B'}]}
        submitDetails={submitDetails} jsObj={{}} questionsDb={[]} history={{}}
        exam={{_id: 5, submitDetails, ...exam}}/>);
}

describe('SubmittedExamPreview: сбой проверки задачи', () => {
    const DETAILS = {1: {status: 'check_error', checkError: {code: 'X'}}, 2: {perc: 80}};

    test('кандидат: задача «не проверена, ментор перепроверит», без полоски балла', () => {
        renderPreview(DETAILS);
        expect(screen.getByTestId('check-error-notice').getAttribute('data-variant')).toBe('candidate');
        expect(screen.getAllByTestId('task-check-error-mark')).toHaveLength(1);
        expect(screen.queryByTestId('exam-check-error-banner')).toBeNull();
        expect(document.querySelectorAll('.taskProgress')).toHaveLength(1);
    });

    test('ментор: предупреждение у задачи и у экзамена, подсказка про Submit Full Test', () => {
        global.env = {isAdmin: true};
        renderPreview(DETAILS, {scoreDetails: {checkErrors: [{question: 1, code: 'X'}]}});
        expect(screen.getByTestId('check-error-notice').getAttribute('data-variant')).toBe('mentor');
        expect(screen.getByTestId('exam-check-error-banner')).toBeInTheDocument();
    });

    test('без сбоев ничего нового не появляется', () => {
        global.env = {isAdmin: true};
        renderPreview({1: {perc: 50}, 2: {perc: 80}});
        expect(screen.queryByTestId('check-error-notice')).toBeNull();
        expect(screen.queryByTestId('exam-check-error-banner')).toBeNull();
        expect(document.querySelectorAll('.taskProgress')).toHaveLength(2);
    });
});
