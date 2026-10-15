import React from 'react';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import Train from './Train';

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

function renderTrain(onResult) {
    return render(<Train
        getStartItems={async () => ITEMS}
        getStartHistory={() => ({})}
        getStartIndex={() => 0}
        getStartTimers={() => ({})}
        getDefaultQuizTime={() => 40}
        getNextInd={(ind, items) => ++ind % items.length}
        onResult={onResult}
        Result={() => <div>итог проверки</div>}
        opts={{quizesLength: ITEMS.length}}
    />);
}

describe('Train: VS-задача в проверке знаний', () => {
    test('после квиза открывается VS-задача с ключом vs_<группа>, «Далее» завершает проверку', async () => {
        let onResult = jest.fn();
        let {container} = renderTrain(onResult);

        await screen.findByText('ответить на квиз');
        // Train после загрузки заданий сбрасывает историю и через setTimeout
        // открывает первое — даём ему это сделать до ответа.
        await act(() => new Promise((r) => setTimeout(r, 20)));
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
