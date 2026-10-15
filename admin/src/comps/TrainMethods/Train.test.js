import React from 'react';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import Train from './Train';
import {calcQuizPerc} from '../VsTask/vsTask';

// Тренажёр тянет аудио, код-ревью и App целиком — для навигации между заданиями
// они не нужны. Квиз заменён кнопкой, которая делает то же, что настоящий
// QuizPreviewNew после верного ответа: зовёт onNext.
jest.mock('../../App', () => ({stopAnyPlay: () => null}));
jest.mock('./AudioShort/AudioShort', () => () => null);
jest.mock('./CodeReview/CodeReview', () => () => null);
jest.mock('../DebugLogs', () => () => null);
// Блокировка второй вкладки с тренировкой (window.startTrain) ходит в Storage.
jest.mock('./DisableScreenWhenTrain', () => ({isErr: () => ({})}));
jest.mock('../Suggest/QuizPreviewNew', () => (props) => (
    <button onClick={() => props.onNext()}>ответить на квиз</button>
));

// CodeRun (Monaco, /run-question) заменён: показывает, что получил, и отдаёт
// результат сабмита так же, как настоящий useCodeRun — через onSubmitResults.
jest.mock('../Suggest/CodeRun', () => (props) => (
    <div data-testid={'code-run'} data-question={props.question._id} data-code-type={props.jsDetails.codeType}
         data-course-module={props.courseModule}>
        <button onClick={() => props.onSubmitResults({totalCount: 2, passCount: 1, wrongCount: 1})}>сабмит неверный</button>
        <button onClick={() => props.onSubmitResults({totalCount: 2, passCount: 2, wrongCount: 0})}>сабмит верный</button>
    </div>
));

beforeEach(() => {
    window.startTrain = null;
    window.stopTrain = null;
    global.t = (key) => key;
    global.http = {get: jest.fn(() => Promise.resolve({})), post: jest.fn(() => Promise.resolve({}))};
    window.localStorage.clear();
});

// Состав проверки знаний модуля, как его отдаёт /api/load-quizes-by-module:
// квизы, затем VS-задача группы с ключом истории vs_<id группы>.
const ITEMS = [
    {opts: {question: 5, quiz: 61}, item: {_id: 61, name: 'Сколько строк?', answerType: 'quiz', variations: []}},
    {opts: {quiz: 'vs_9'}, item: {_id: 9, name: 'SQL-задача', type: 'vs_task', answerType: 'vs_task', info_arr: [{lng: 'sql', task_id: 3}]}},
];

function renderTrain(onResult, getStartIndex, items = ITEMS, onChange) {
    return render(<Train
        getStartItems={async () => items}
        getStartHistory={() => ({})}
        getStartIndex={getStartIndex}
        getStartTimers={() => ({})}
        getDefaultQuizTime={() => 40}
        getNextInd={(ind, items) => ++ind % items.length}
        onResult={onResult}
        onChange={onChange}
        Result={() => <div>итог проверки</div>}
        opts={{quizesLength: items.length}}
    />);
}

describe('Train: VS-задача в проверке знаний', () => {
    test('после квиза открывается VS-задача с ключом vs_<группа>, «Далее» завершает проверку', async () => {
        let onResult = jest.fn();
        let getStartIndex = jest.fn(() => 0);
        let {container} = renderTrain(onResult, getStartIndex);

        // Train после загрузки заданий сбрасывает историю и открывает первое через
        // setTimeout(0) (activeInd -1 → 0). Ответ, данный в этом окне, ушёл бы в
        // «итог» — ждём getStartIndex и следующий тик, тогда первое уже открыто.
        await waitFor(() => expect(getStartIndex).toHaveBeenCalled());
        await act(() => new Promise((r) => setTimeout(r, 0)));
        await waitFor(() => expect(container.querySelector('[data-testid="train-item"]').getAttribute('data-quiz-key')).toBe('61'));
        fireEvent.click(screen.getByText('ответить на квиз'));

        await waitFor(() => expect(container.querySelector('[data-testid="vs-task"]')).toBeTruthy());
        let train = container.querySelector('[data-testid="train-item"]');
        expect(train.getAttribute('data-quiz-key')).toBe('vs_9');
        expect(train.getAttribute('data-answer-type')).toBe('vs_task');

        // Без кнопки кандидат застревал на VS-задаче: модалка проверки без
        // закрытия, итог не считался, глава и модуль не засчитывались.
        fireEvent.click(screen.getByTestId('vs-task-next'));

        await waitFor(() => expect(screen.getByText('итог проверки')).toBeInTheDocument());
        expect(onResult).toHaveBeenCalledTimes(1);
    });
});

// SQL-задача (js-task, codeType 'sql') из /api/load-quizes-by-module: ключ js_<id вопроса>.
const JS_ITEMS = [
    {opts: {quiz: 'js_8', question: 8}, item: {
        _id: 8, question: 8, name: 'Выведите имена клиентов', type: 'js_task', answerType: 'js_task',
        jsDetails: {codeType: 'sql', schemaSql: 'CREATE TABLE c (name text)'}, moduleInfo: {_id: 1000, name: 'Модуль'},
    }},
];

describe('Train: js-задача в проверке знаний', () => {
    test('рендерит CodeRun с jsDetails вопроса, засчитывает только сабмит со всеми пройденными тестами', async () => {
        let onChange = jest.fn();
        let getStartIndex = jest.fn(() => 0);
        let {container} = renderTrain(jest.fn(), getStartIndex, JS_ITEMS, onChange);
        await waitFor(() => expect(getStartIndex).toHaveBeenCalled());
        await act(() => new Promise((r) => setTimeout(r, 0)));

        let codeRun = await screen.findByTestId('code-run');
        let train = container.querySelector('[data-testid="train-item"]');
        expect(train.getAttribute('data-quiz-key')).toBe('js_8');
        expect(train.getAttribute('data-answer-type')).toBe('js_task');
        expect(codeRun.getAttribute('data-question')).toBe('8');
        expect(codeRun.getAttribute('data-code-type')).toBe('sql');
        expect(codeRun.getAttribute('data-course-module')).toBe('1000');

        fireEvent.click(screen.getByText('сабмит неверный'));
        let failed = onChange.mock.calls[onChange.mock.calls.length - 1][0];
        expect(failed).toMatchObject({answerType: 'js_task', quizId: 'js_8', data: {isCorrect: false}});
        expect(calcQuizPerc(failed.history, 1).quizPerc).toBe(0);
        expect(screen.getByTestId('js-task-result').getAttribute('data-ok')).toBe('false');

        fireEvent.click(screen.getByText('сабмит верный'));
        let passed = onChange.mock.calls[onChange.mock.calls.length - 1][0];
        expect(passed.data.isCorrect).toBe(true);
        // Процент сдачи модуля: js-задача — одно задание наравне с квизом.
        expect(calcQuizPerc(passed.history, 1).quizPerc).toBe(100);
        expect(screen.getByTestId('js-task-result').getAttribute('data-ok')).toBe('true');
    });
});
