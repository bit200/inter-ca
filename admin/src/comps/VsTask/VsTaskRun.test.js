import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import VsTaskRun from './VsTaskRun';

// Monaco/markdown-обвязка CodeRun в jsdom не грузится и для развилки не нужна.
jest.mock('@uiw/react-md-editor', () => () => null);
jest.mock('../LazyEditor/LazyEditor', () => () => null);
jest.mock('../Suggest/QuestionDetails', () => () => null);
jest.mock('../Suggest/QuestionCorrectSolution', () => () => null);
jest.mock('../StarRating', () => () => null);

beforeEach(() => {
    global.t = (key) => key;
    window.localStorage.clear();
});

function mockHttp({startRes, testInfo} = {}) {
    let get = jest.fn((url, query) => {
        if (url === '/pre-start-session') {
            return Promise.resolve({session_id: 's-1', lng: 'sql', session: {session_id: 's-1', server_http: 'http://dm', info: {lng: 'sql'}}});
        }
        if (url === '/exec-start-session') {
            return Promise.resolve(startRes || {start_info: {start_data: {vscode_link: 'https://vcode/s-1'}}});
        }
        if (url === '/populated-session') {
            return Promise.resolve({item: {session_id: query.session_id, test_info: testInfo}});
        }
        return Promise.resolve({});
    });
    global.http = {get};
    return get;
}

const SQL_TASK = {_id: 42, name: 'Выборка заказов', type: 'vs_task', info_arr: [{lng: 'sql', task_id: 9}]};

describe('VS Code-задача в экзамене/тренировке', () => {
    test('кнопка поднимает сессию и открывает редактор в iframe, SQL помечен', async () => {
        let get = mockHttp({testInfo: {status: 'err', details: {total: 3, passed: 2, failed: 1}}});
        let {container} = render(<VsTaskRun task={SQL_TASK} examId={77}/>);

        expect(screen.getByText('vsTaskSql')).toBeInTheDocument();
        fireEvent.click(screen.getByText('vsTaskOpen'));

        await waitFor(() => expect(container.querySelector('iframe')).toBeTruthy());
        expect(container.querySelector('iframe').getAttribute('src')).toBe('https://vcode/s-1');
        expect(get).toHaveBeenCalledWith('/pre-start-session',
            expect.objectContaining({task_group_id: 42, lng: 'sql', type: 'client', exam_id: 77}), {wo_notify: true});
        expect(get).toHaveBeenCalledWith('/exec-start-session', {session_id: 's-1'}, {wo_notify: true});

        await waitFor(() => expect(screen.getByText('vsTaskHasFailed')).toBeInTheDocument());
        expect(container.querySelectorAll('.vs-task-cell.ok')).toHaveLength(2);
        expect(container.querySelectorAll('.vs-task-cell.err')).toHaveLength(1);
    });

    test('редактор открывается на весь экран, «Свернуть» возвращает в страницу', async () => {
        mockHttp();
        let {container} = render(<VsTaskRun task={SQL_TASK} examId={77}/>);
        fireEvent.click(screen.getByText('vsTaskOpen'));

        await waitFor(() => expect(container.querySelector('.vs-task-frame-full iframe')).toBeTruthy());
        fireEvent.click(screen.getByText('vsTaskExitFullscreen'));
        expect(container.querySelector('.vs-task-frame-full')).toBeNull();
        expect(container.querySelector('iframe')).toBeTruthy();
        fireEvent.click(screen.getByText('vsTaskFullscreen'));
        expect(container.querySelector('.vs-task-frame-full iframe')).toBeTruthy();
    });

    test('ошибка старта docker-m — понятное сообщение вместо пустого iframe', async () => {
        mockHttp({startRes: {err_obj: {msg: 'Error: connect ECONNREFUSED', code: 501}}});
        let {container} = render(<VsTaskRun task={SQL_TASK}/>);
        fireEvent.click(screen.getByText('vsTaskOpen'));

        await waitFor(() => expect(screen.getByText('vsTaskStartFailed')).toBeInTheDocument());
        expect(screen.getByText('Error: connect ECONNREFUSED')).toBeInTheDocument();
        expect(container.querySelector('iframe')).toBeNull();
        expect(screen.getByText('vsTaskReopen')).toBeInTheDocument();
    });

    test('сохранённая сессия экзамена: сразу показываем результат тестов', async () => {
        let get = mockHttp({testInfo: {status: 'ok', details: {total: 2, passed: 2}}});
        render(<VsTaskRun task={SQL_TASK} examId={77} hist={{session_id: 's-old', lng: 'sql'}}/>);
        await waitFor(() => expect(screen.getByText('vsTaskAllPassed')).toBeInTheDocument());
        expect(get).toHaveBeenCalledWith('/populated-session', {session_id: 's-old'}, {wo_notify: true});
    });

    test('CodeRun отдаёт VS-задачу в редактор VS Code, а не в Monaco', () => {
        mockHttp();
        window.env = window.env || {domain: ''};
        let CodeRun = require('../Suggest/CodeRun').default;
        render(<CodeRun question={SQL_TASK} examId={77}/>);
        expect(screen.getByText('vsTaskOpen')).toBeInTheDocument();
    });
});
