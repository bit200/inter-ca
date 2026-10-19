import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {getEditorLanguage} from './useCodeRun';
import {CodeTaskResults, buildTreeRows} from './CodeTaskResults';
import CodeRun from './CodeRun';

jest.mock('@uiw/react-md-editor', () => ({Markdown: () => null}));
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

    test('дерево с папками: редактируемые и тесты только чтение', () => {
        render(<CodeRun question={{_id: 7, name: 'x'}} jsDetails={DETAILS} history={{}} isExam/>);
        expect(screen.getAllByTestId('code-file').map(el => [el.getAttribute('data-path'), el.getAttribute('data-readonly')]))
            .toEqual([['src/app.py', 'false'], ['src/util.py', 'false'], ['tests/test_app.py', 'true']]);
        expect(screen.getByTestId('editor').getAttribute('data-language')).toBe('python');
        fireEvent.click(screen.getAllByTestId('code-file')[2]);
        expect(screen.getByTestId('editor').getAttribute('data-readonly')).toBe('true');
        expect(buildTreeRows([{name: 'a/b/c.py'}]).map(r => r.type)).toEqual(['dir', 'dir', 'file']);
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
