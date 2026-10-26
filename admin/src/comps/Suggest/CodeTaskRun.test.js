import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {getEditorLanguage} from './useCodeRun';
import {CodeTaskResults, buildTreeRows} from './CodeTaskResults';
import CodeRun from './CodeRun';

jest.mock('@uiw/react-md-editor', () => ({Markdown: ({source}) => <span data-testid="md">{source}</span>}));
jest.mock('../LazyEditor/LazyEditor', () => (props) =>
    <div data-testid="editor" data-language={props.language} data-readonly={String(!!(props.options || {}).readOnly)}
         data-value={props.defaultValue}/>);
jest.mock('./QuestionDetails', () => () => null);
jest.mock('./QuestionCorrectSolution', () => () => null);
jest.mock('../StarRating', () => () => null);
jest.mock('libs/user/user', () => ({get_id: () => 1}));

beforeEach(() => {
    global.t = (key) => key;
    global.Storage = {get: () => '', set: () => {}, changeStatus: () => {}};
    global.http = {post: jest.fn(() => Promise.resolve({totalCount: 0}))};
});

const DETAILS = {
    codeType: 'code', lang: 'python',
    starterFiles: {'src/app.py': 'def f(): pass', 'src/util.py': 'x = 1'},
    testFiles: {'tests/test_app.py': 'def test_f(): pass'},
    editablePaths: ['src/app.py', 'src/util.py'],
};

describe('Задача по языку (codeType code) в CodeRun', () => {
    test('язык Monaco по lang и расширению; старые codeType как раньше', () => {
        expect(getEditorLanguage('a.py', 'code', 'python')).toBe('python');
        expect(getEditorLanguage('A.java', 'code', 'java')).toBe('java');
        expect(getEditorLanguage('main.go', 'code', 'go')).toBe('go');
        expect(getEditorLanguage('a.ts', 'code', 'typescript')).toBe('typescript');
        expect(getEditorLanguage('Makefile', 'code', 'go')).toBe('go');
        expect(getEditorLanguage('a.ts', 'js')).toBe('typescript');
        expect(getEditorLanguage('', 'sql')).toBe('sql');
    });

    test('условие code-задачи: заголовок (name) и описание (title) оба видны', () => {
        render(<CodeRun question={{_id: 7, name: 'React + Redux: список дел', title: 'Допишите слайс'}}
                        jsDetails={DETAILS} history={{}} isExam/>);
        expect(screen.getByTestId('code-condition-text').textContent).toBe('Допишите слайс');
        expect(screen.getAllByTestId('md').map(el => el.textContent)).toContain('React + Redux: список дел');
    });

    test('дерево с папками: редактируемые и тесты только чтение', () => {
        render(<CodeRun question={{_id: 7, name: 'x'}} jsDetails={DETAILS} history={{}} isExam/>);
        expect(screen.getAllByTestId('code-file').map(el => [el.getAttribute('data-path'), el.getAttribute('data-readonly')]))
            .toEqual([['src/app.py', 'false'], ['src/util.py', 'false'], ['tests/test_app.py', 'true']]);
        expect(screen.getByTestId('editor').getAttribute('data-language')).toBe('python');
        expect(screen.getAllByTestId('code-readonly-icon').length).toBe(1);
        expect(screen.getAllByTestId('code-file')[2].textContent).not.toMatch(/только чтение/);
        fireEvent.click(screen.getAllByTestId('code-file')[2]);
        expect(screen.getByTestId('editor').getAttribute('data-readonly')).toBe('true');
        expect(buildTreeRows([{name: 'a/b/c.py'}]).map(r => r.type)).toEqual(['dir', 'dir', 'file']);
    });

    test('дерево файлов — отдельная колонка слева от редактора, ширину можно тянуть', () => {
        let {container} = render(<CodeRun question={{_id: 7, name: 'x'}} jsDetails={DETAILS} history={{}} isExam/>);
        let col = screen.getByTestId('code-tree-col');
        expect(col.parentNode.querySelector('.codeEditorCol')).not.toBeNull();
        expect(col.contains(screen.getByTestId('code-files-tree'))).toBe(true);
        expect(container.querySelector('.codeEditorCol').contains(screen.getByTestId('code-files-tree'))).toBe(false);
        expect(screen.getAllByTestId('code-file').map(f => f.getAttribute('data-path')))
            .toEqual(['src/app.py', 'src/util.py', 'tests/test_app.py']);
        expect(col.style.width).toBe('200px');
        fireEvent.mouseDown(screen.getByTestId('code-tree-resize'), {clientX: 200});
        fireEvent.mouseMove(window, {clientX: 300});
        fireEvent.mouseUp(window);
        expect(col.style.width).toBe('300px');
    });

    test('колонка дерева с отступом слева 10px; кнопка разворачивает блок на весь экран', () => {
        let {container} = render(<CodeRun question={{_id: 7, name: 'x'}} jsDetails={DETAILS} history={{}} isExam/>);
        let scss = require('fs').readFileSync(require('path').join(__dirname, 'codeRun.scss'), 'utf8');
        expect(scss).toMatch(/\.codeTreeCol \{[^}]*padding: 6px 0 6px 10px/);
        let split = () => document.body.querySelector('.codeRunWrap');
        expect(screen.getByTestId('code-tree-col').contains(screen.getByTestId('code-full-btn'))).toBe(false);
        expect(container.querySelector('.codeEditorCol').contains(screen.getByTestId('code-full-btn'))).toBe(true);
        expect(split().classList.contains('codeRunFull')).toBe(false);
        expect(split().parentNode).not.toBe(document.body);
        fireEvent.click(screen.getByTestId('code-full-btn'));
        expect(split().classList.contains('codeRunFull')).toBe(true);
        // вынесен в body, иначе предок модалки с transform ограничивает fixed своими границами
        expect(split().parentNode).toBe(document.body);
        fireEvent.keyDown(window, {key: 'Escape'});
        expect(split().classList.contains('codeRunFull')).toBe(false);
        expect(split().parentNode).not.toBe(document.body);
    });

    test('в обычной (не code) задаче тоже есть кнопка «на весь экран»', () => {
        render(<CodeRun question={{_id: 8, name: 'x'}} jsDetails={{codeType: 'js', starter: 'var a;'}} history={{}} isExam/>);
        let split = () => document.body.querySelector('.codeRunWrap');
        fireEvent.click(screen.getByTestId('code-full-btn'));
        expect(split().classList.contains('codeRunFull')).toBe(true);
        expect(split().parentNode).toBe(document.body);
        fireEvent.keyDown(window, {key: 'Escape'});
        expect(split().classList.contains('codeRunFull')).toBe(false);
    });

    test('после выхода из полного экрана колонки сохраняют ширину, а не сжимаются', () => {
        render(<CodeRun question={{_id: 8, name: 'x'}} jsDetails={{codeType: 'js', starter: 'var a;'}} history={{}} isExam/>);
        let wrap = () => document.body.querySelector('.codeRunWrap');
        let widths = () => [wrap().querySelector('.crRight').style.width, wrap().querySelector('.crLeft').style.width];
        let before = widths();
        expect(before[0]).not.toBe('');
        fireEvent.click(screen.getByTestId('code-full-btn'));
        expect(widths()).toEqual(before);
        fireEvent.keyDown(window, {key: 'Escape'});
        expect(widths()).toEqual(before);
    });

    test('«Запустить» шлёт все редактируемые файлы, без тестов', async () => {
        render(<CodeRun question={{_id: 7, name: 'x'}} jsDetails={DETAILS} history={{files: {'src/util.py': 'x = 2'}}} isExam/>);
        fireEvent.click(screen.getByTestId('code-run-run'));
        await waitFor(() => expect(global.http.post).toHaveBeenCalled());
        expect(global.http.post.mock.calls[0][1].files)
            .toEqual({'src/app.py': 'def f(): pass', 'src/util.py': 'x = 2'});
    });

    test('результаты: тесты, скрытые только статус, ошибка компиляции отдельно', () => {
        let {container} = render(<CodeTaskResults runResults={{
            totalCount: 3, passCount: 1, wrongCount: 2, compileError: 'main.go:3: syntax error',
            tests: [
                {name: 'test_a', status: 'passed'},
                {name: 'test_b', status: 'failed', message: 'assert 1 == 2'},
                {name: 'secret', status: 'failed', hidden: true},
            ],
        }}/>);
        expect(screen.getByTestId('code-compile-error').textContent).toContain('syntax error');
        expect(screen.getAllByTestId('code-test').map(el => el.getAttribute('data-status'))).toEqual(['passed', 'failed', 'failed']);
        expect(screen.getByText('assert 1 == 2')).toBeInTheDocument();
        expect(screen.queryByText('secret')).toBeNull();
        expect(screen.getByText('codeTestHidden')).toBeInTheDocument();
        expect(container.querySelectorAll('pre')).toHaveLength(2);
    });

    test('js по-прежнему шлёт {"": code}', async () => {
        render(<CodeRun question={{_id: 6, name: 'x'}} jsDetails={{codeType: 'js', fields: [], starter: 'abc'}} history={{}} isExam/>);
        fireEvent.click(screen.getByTestId('code-run-run'));
        await waitFor(() => expect(global.http.post).toHaveBeenCalled());
        expect(global.http.post.mock.calls[0][1].files).toEqual({'': 'abc'});
    });
});

describe('Превью React-задачи (codeType code, lang react)', () => {
    const {buildPreviewUrl, isReactPreview} = require('./CodeRun');
    const REACT = {...DETAILS, lang: 'react', starterFiles: {'src/index.jsx': 'x'}, editablePaths: ['src/index.jsx']};

    beforeEach(() => { global.env = {domain: 'http://api'}; });

    test('адреса превью: кандидат и экзамен', () => {
        expect(buildPreviewUrl({isNewExam: false, userId: 5, questionId: 7, token: 'a b', cd: 1}))
            .toBe('http://api/preview/5/7?cd=1&token=a%20b');
        expect(buildPreviewUrl({isNewExam: true, examId: 9, questionId: 7, token: 't', cd: 1}))
            .toBe('http://api/admin_preview/9/7?cd=1&token=t');
        expect(isReactPreview(REACT)).toBe(true);
        expect(isReactPreview(DETAILS)).toBe(false);
        expect(isReactPreview({codeType: 'react', lang: 'react'})).toBe(false);
    });

    test('вкладка «Превью» только у react-задачи; iframe грузит бандл api', () => {
        const {unmount} = render(<CodeRun question={{_id: 7, name: 'x'}} jsDetails={DETAILS} history={{}} isExam/>);
        expect(screen.queryByText('previewTab')).toBeNull();
        unmount();
        render(<CodeRun question={{_id: 7, name: 'x'}} jsDetails={REACT} history={{}} isNewExam examId={9}/>);
        fireEvent.click(screen.getByText('previewTab'));
        expect(screen.getByTestId('react-preview').querySelector('iframe').getAttribute('src'))
            .toMatch(/^http:\/\/api\/admin_preview\/9\/7\?/);
    });
});

describe('Сбой проверки (checkError) в CodeRun', () => {
    const CHECK_ERR = {error: 'x', message: 'Проверка временно недоступна, попробуйте ещё раз', checkError: {code: 'RUNNER_UNAVAILABLE'}};
    const KINDS = {
        code: DETAILS,
        js: {codeType: 'js', fields: [], starter: 'abc'},
        logreader: {codeType: 'logreader', fields: [], starter: 'abc'},
        sql: {codeType: 'sql', dialect: 'postgres', starter: 'select 1'},
    };

    Object.entries(KINDS).forEach(([kind, details]) => {
        test(kind + ': «Запустить» при 503 — сообщение вместо тестов, статус не меняется', async () => {
            global.http.post = jest.fn(() => Promise.reject(CHECK_ERR));
            global.Storage.changeStatus = jest.fn();
            render(<CodeRun question={{_id: 7, name: 'x'}} jsDetails={details} history={{}} isExam/>);
            fireEvent.click(screen.getByTestId('code-run-run'));
            await waitFor(() => expect(screen.getAllByTestId('check-error-notice').length).toBe(1));
            expect(screen.queryByTestId('code-task-results')).toBeNull();
            expect(screen.queryByText(/testPasses/)).toBeNull();
            expect(global.Storage.changeStatus).not.toHaveBeenCalled();
        });
    });

    test('«Сдать» при 503: onSubmitResults не зовётся, статус very_good не ставится', async () => {
        global.http.post = jest.fn(() => Promise.reject(CHECK_ERR));
        global.Storage.changeStatus = jest.fn();
        let onSubmitResults = jest.fn();
        render(<CodeRun question={{_id: 7, name: 'x'}} jsDetails={DETAILS} history={{}} onSubmitResults={onSubmitResults}/>);
        fireEvent.click(screen.getByTestId('code-run-submit'));
        await waitFor(() => expect(screen.getByTestId('check-error-notice')).toBeInTheDocument());
        expect(onSubmitResults).not.toHaveBeenCalled();
        expect(global.Storage.changeStatus).not.toHaveBeenCalled();
    });

    test('checkError в теле 200 — тоже сообщение, без статуса', async () => {
        global.http.post = jest.fn(() => Promise.resolve({checkError: {code: 'SANDBOX_FAILED'}}));
        global.Storage.changeStatus = jest.fn();
        render(<CodeRun question={{_id: 6, name: 'x'}} jsDetails={KINDS.js} history={{}} isExam/>);
        fireEvent.click(screen.getByTestId('code-run-run'));
        await waitFor(() => expect(screen.getByTestId('check-error-notice')).toBeInTheDocument());
        expect(global.Storage.changeStatus).not.toHaveBeenCalled();
    });

    test('обычный fail (ошибка сети без checkError) показывается как раньше', async () => {
        global.http.post = jest.fn(() => Promise.reject(new Error('boom')));
        render(<CodeRun question={{_id: 6, name: 'x'}} jsDetails={KINDS.js} history={{}} isExam/>);
        fireEvent.click(screen.getByTestId('code-run-run'));
        await waitFor(() => expect(screen.getAllByTestId('code-run-results')[0].textContent).toContain('boom'));
        expect(screen.queryByTestId('check-error-notice')).toBeNull();
    });
});


describe('Лоадер на кнопках «Запуск» и «Сабмит»', () => {
    test('во время запуска спиннер на «Запуск», обе кнопки заблокированы', async () => {
        let resolve;
        global.http.post = jest.fn(() => new Promise(r => { resolve = r; }));
        render(<CodeRun question={{_id: 6, name: 'x'}} jsDetails={DETAILS} history={{}}/>);
        fireEvent.click(screen.getByTestId('code-run-run'));
        expect(screen.getByTestId('code-run-loader')).toBeInTheDocument();
        expect(screen.queryByTestId('code-submit-loader')).toBeNull();
        expect(screen.getByTestId('code-run-run')).toBeDisabled();
        expect(screen.getByTestId('code-run-submit')).toBeDisabled();
        resolve({wrongCount: 0});
        await waitFor(() => expect(screen.queryByTestId('code-run-loader')).toBeNull());
        expect(screen.getByTestId('code-run-submit')).not.toBeDisabled();
    });

    test('во время сабмита спиннер на «Сабмит»', async () => {
        let resolve;
        global.http.post = jest.fn(() => new Promise(r => { resolve = r; }));
        render(<CodeRun question={{_id: 6, name: 'x'}} jsDetails={DETAILS} history={{}}/>);
        fireEvent.click(screen.getByTestId('code-run-submit'));
        expect(screen.getByTestId('code-submit-loader')).toBeInTheDocument();
        expect(screen.queryByTestId('code-run-loader')).toBeNull();
        resolve({wrongCount: 0});
        await waitFor(() => expect(screen.queryByTestId('code-submit-loader')).toBeNull());
    });
});
