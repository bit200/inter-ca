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

        await waitFor(() => expect(document.querySelector('iframe')).toBeTruthy());
        expect(document.querySelector('iframe').getAttribute('src')).toBe('https://vcode/s-1');
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

        await waitFor(() => expect(document.querySelector('.vs-task-frame-full iframe')).toBeTruthy());
        // fixed внутри модалки с transform обрезается её шириной — оверлей живёт в body
        expect(document.querySelector('.vs-task-frame-full').parentElement).toBe(document.body);
        expect(container.querySelector('.vs-task-frame-full')).toBeNull();
        fireEvent.click(screen.getByText('vsTaskExitFullscreen'));
        expect(document.querySelector('.vs-task-frame-full')).toBeNull();
        expect(document.querySelector('iframe')).toBeTruthy();
        fireEvent.click(screen.getByText('vsTaskFullscreen'));
        expect(document.querySelector('.vs-task-frame-full iframe')).toBeTruthy();
    });

    test('ошибка старта docker-m — понятное сообщение вместо пустого iframe', async () => {
        mockHttp({startRes: {err_obj: {msg: 'Error: connect ECONNREFUSED', code: 501}}});
        let {container} = render(<VsTaskRun task={SQL_TASK}/>);
        fireEvent.click(screen.getByText('vsTaskOpen'));

        await waitFor(() => expect(screen.getByText('vsTaskStartFailed')).toBeInTheDocument());
        expect(screen.getByText('Error: connect ECONNREFUSED')).toBeInTheDocument();
        expect(document.querySelector('iframe')).toBeNull();
        expect(screen.getByText('vsTaskReopen')).toBeInTheDocument();
    });

    test('сохранённая сессия экзамена: сразу показываем результат тестов', async () => {
        let get = mockHttp({testInfo: {status: 'ok', details: {total: 2, passed: 2}}});
        render(<VsTaskRun task={SQL_TASK} examId={77} hist={{session_id: 's-old', lng: 'sql'}}/>);
        await waitFor(() => expect(screen.getByText('vsTaskAllPassed')).toBeInTheDocument());
        expect(get).toHaveBeenCalledWith('/populated-session', {session_id: 's-old'}, {wo_notify: true});
    });

    test('в тренажёре есть «Далее»: уход с задачи, основной — когда все тесты прошли', async () => {
        mockHttp({testInfo: {status: 'ok', details: {total: 2, passed: 2}}});
        let onNext = jest.fn();
        render(<VsTaskRun task={SQL_TASK} hist={{session_id: 's-old', lng: 'sql'}} onNext={onNext}/>);

        await waitFor(() => expect(screen.getByTestId('vs-task-result').getAttribute('data-status')).toBe('ok'));
        expect(screen.getByTestId('vs-task-result').getAttribute('data-passed')).toBe('2');
        expect(screen.getByTestId('vs-task-result').getAttribute('data-total')).toBe('2');
        expect(screen.getByTestId('vs-task-next')).toHaveClass('btn-primary');
        expect(screen.getByTestId('vs-task-open')).not.toHaveClass('btn-primary');

        fireEvent.click(screen.getByTestId('vs-task-next'));
        expect(onNext).toHaveBeenCalledTimes(1);
    });

    test('вне тренажёра (экзамен, CodeRun) «Далее» нет', () => {
        mockHttp();
        render(<VsTaskRun task={SQL_TASK} examId={77}/>);
        expect(screen.queryByTestId('vs-task-next')).toBeNull();
        expect(screen.getByTestId('vs-task').getAttribute('data-task-id')).toBe('42');
    });

    test('CodeRun отдаёт VS-задачу в редактор VS Code, а не в Monaco', () => {
        mockHttp();
        window.env = window.env || {domain: ''};
        let CodeRun = require('../Suggest/CodeRun').default;
        render(<CodeRun question={SQL_TASK} examId={77}/>);
        expect(screen.getByText('vsTaskOpen')).toBeInTheDocument();
    });

    test('«Завершить и отправить решение»: сохраняет патч, гонит тесты и обновляет результат', async () => {
        let get = mockHttp({testInfo: {status: 'ok', details: {total: 2, passed: 2, failed: 0}}});
        let calls = [];
        global.fetch = jest.fn((url) => {
            calls.push(url);
            return Promise.resolve({json: () => Promise.resolve({}), text: () => Promise.resolve('')});
        });
        let {container} = render(<VsTaskRun task={SQL_TASK} examId={77}/>);
        fireEvent.click(screen.getByText('vsTaskOpen'));
        await waitFor(() => expect(document.querySelector('iframe')).toBeTruthy());

        let before = get.mock.calls.filter(c => c[0] === '/populated-session').length;
        fireEvent.click(container.querySelector('.vs-task-actions .btn-success'));
        await waitFor(() => expect(calls).toEqual([
            'http://dm/create_upload_session_patch?session_id=s-1',
            'http://dm/full_test_new_sse?session_id=s-1'
        ]));
        await waitFor(() => expect(get.mock.calls.filter(c => c[0] === '/populated-session').length).toBeGreaterThan(before));
    });

    test('пункт «Завершить задачу» в самом редакторе отправляет решение', async () => {
        mockHttp();
        global.fetch = jest.fn(() => Promise.resolve({json: () => Promise.resolve({}), text: () => Promise.resolve('')}));
        let {container} = render(<VsTaskRun task={SQL_TASK} examId={77}/>);
        fireEvent.click(screen.getByText('vsTaskOpen'));
        await waitFor(() => expect(document.querySelector('iframe')).toBeTruthy());

        window.dispatchEvent(new MessageEvent('message', {data: {type: 'treeitemClick', elementText: 'Завершить задачу'}}));
        await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    });

    test('при сохранённой сессии кнопка зовёт «Вернуться к решению»', () => {
        mockHttp();
        window.localStorage.setItem('vs-session-77-42', JSON.stringify({session_id: 's-1', lng: 'sql'}));
        render(<VsTaskRun task={SQL_TASK} examId={77}/>);
        expect(screen.getByText('vsTaskBack')).toBeInTheDocument();
    });
});

describe('VsTaskRun: слой полноэкранного редактора', () => {
    it('z-index рамки не меньше слоя MyModal (иначе редактор уходит за модалку)', () => {
        const fs = require('fs');
        const z = (file, sel) => Number(new RegExp(sel + '\\s*{[^}]*?z-index:\\s*(\\d+)').exec(fs.readFileSync(__dirname + file, 'utf8'))[1]);
        const frame = z('/VsTaskRun.css', '\\.vs-task-frame-full');
        const modal = z('/../../libs/MyModal/myModal.css', '[^{}]*');
        expect(frame).toBeGreaterThanOrEqual(Math.min(modal, 2147483647));
    });
});
