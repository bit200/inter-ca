import {render, screen} from '@testing-library/react';
import {getEditorLanguage} from './useCodeRun';
import {SqlRunResults, SqlReferenceResults} from './SqlRunResults';
import CodeRun from './CodeRun';

// Monaco/markdown-обвязка CodeRun в jsdom не грузится; язык редактора видно по пропу.
jest.mock('@uiw/react-md-editor', () => ({Markdown: () => null}));
jest.mock('../LazyEditor/LazyEditor', () => (props) => <div data-testid="editor" data-language={props.language}/>);
jest.mock('./QuestionDetails', () => () => null);
jest.mock('./QuestionCorrectSolution', () => () => null);
jest.mock('../StarRating', () => () => null);
jest.mock('libs/user/user', () => ({get_id: () => 1}));

beforeEach(() => {
    global.t = (key) => key;
    global.Storage = {get: () => '', set: () => {}};
    window.localStorage.clear();
});

const SQL_DETAILS = {
    codeType: 'sql',
    dialect: 'postgres',
    schemaSql: 'create table users (id int, name text);',
    starter: 'select ',
};

describe('SQL-задание в CodeRun', () => {
    test('язык редактора — sql для codeType sql и для файлов .sql, остальное как раньше', () => {
        expect(getEditorLanguage('', 'sql')).toBe('sql');
        expect(getEditorLanguage('index.js', 'sql')).toBe('sql');
        expect(getEditorLanguage('q.sql', 'js')).toBe('sql');
        expect(getEditorLanguage('a.ts', 'js')).toBe('typescript');
        expect(getEditorLanguage('', 'js')).toBe('javascript');
    });

    test('результат — таблицы «ваш»/«ожидаемый» с NULL и причиной расхождения', () => {
        let {container} = render(<SqlRunResults runResults={{
            totalCount: 1, passCount: 0, wrongCount: 1,
            sqlResults: [{
                ind: 0, ok: false, reason: 'rows_mismatch', message: 'Строк: ожидалось 2, получено 1',
                actual: {columns: [{name: 'name'}], rows: [['Ann']]},
                expected: {columns: [{name: 'name'}], rows: [['Ann'], [null]]},
            }],
        }}/>);
        expect(screen.getByText('Строк: ожидалось 2, получено 1')).toBeInTheDocument();
        expect(screen.getByText('currentResult')).toBeInTheDocument();
        expect(screen.getByText('expectResult')).toBeInTheDocument();
        expect(container.querySelectorAll('table.sqlResultTable')).toHaveLength(2);
        expect(container.querySelector('td.sqlNull').textContent).toBe('NULL');
        expect(container.querySelector('.sqlCase').getAttribute('status')).toBe('error');
    });

    test('скрытый кейс сдачи подписан и показывает только ваш результат', () => {
        let {container} = render(<SqlRunResults runResults={{
            totalCount: 2, passCount: 1, wrongCount: 1,
            sqlResults: [
                {ind: 0, ok: true, actual: {columns: [{name: 'n'}], rows: [['1']]}, expected: {columns: [{name: 'n'}], rows: [['1']]}},
                {ind: 1, ok: false, hidden: true, message: 'Лишняя строка', actual: {columns: [{name: 'n'}], rows: [['2']], truncated: true}},
            ],
        }}/>);
        expect(screen.getByText('sqlHiddenCase')).toBeInTheDocument();
        expect(screen.getByText('sqlRowsTruncated')).toBeInTheDocument();
        expect(container.querySelectorAll('table.sqlResultTable')).toHaveLength(3);
    });

    test('сбой запроса без sqlResults показывает текст ошибки', () => {
        render(<SqlRunResults runResults={{totalCount: 1, passCount: 0, wrongCount: 1, firstError: {ind: 0, res1: {errMsg: 'Network down'}}}}/>);
        expect(screen.getByText('Network down')).toBeInTheDocument();
    });

    test('CodeRun для sql: редактор sql, без вкладки logs, внизу схема БД вместо кейсов', () => {
        let {container} = render(<CodeRun question={{_id: 5, name: 'Найти пользователей'}} jsDetails={SQL_DETAILS} history={{}} isExam/>);
        expect(screen.getByTestId('editor').getAttribute('data-language')).toBe('sql');
        expect(screen.queryByText('logs')).toBeNull();
        expect(screen.getByText('sqlSchema')).toBeInTheDocument();
        expect(screen.getByText(SQL_DETAILS.schemaSql)).toBeInTheDocument();
        expect(container.querySelector('.cases-wrap')).toBeNull();
    });

    test('CodeRun для js по-прежнему с вкладкой logs и кейсами', () => {
        let {container} = render(<CodeRun question={{_id: 6, name: 'x'}} jsDetails={{codeType: 'js', fields: []}} history={{}} isExam/>);
        expect(screen.getByText('logs')).toBeInTheDocument();
        expect(container.querySelector('.cases-wrap')).not.toBeNull();
    });

    // Разметка для e2e sql-course-flow (часть 2): кейс несёт итог и причину, итог
    // прогона — счётчики, схема и кнопки CodeRun находятся без текста интерфейса.
    test('e2e-разметка: кейсы с data-ok/data-hidden/data-reason, счётчики прогона', () => {
        let {container} = render(<SqlRunResults runResults={{
            totalCount: 2, passCount: 1, wrongCount: 1,
            sqlResults: [
                {ind: 0, ok: true, reason: 'ok'},
                {ind: 1, ok: false, hidden: true, reason: 'forbidden', message: 'Разрешён только один запрос'},
            ],
        }}/>);
        let results = screen.getByTestId('sql-run-results');
        expect(results.getAttribute('data-pass')).toBe('1');
        expect(results.getAttribute('data-total')).toBe('2');
        let cases = container.querySelectorAll('[data-testid="sql-case"]');
        expect([...cases].map(it => [it.dataset.ok, it.dataset.hidden, it.dataset.reason])).toEqual([
            ['true', 'false', 'ok'],
            ['false', 'true', 'forbidden'],
        ]);
    });

    test('e2e-разметка: сбой запроса без sqlResults — кейс с причиной request_error', () => {
        render(<SqlRunResults runResults={{totalCount: 1, passCount: 0, wrongCount: 1, firstError: {ind: 0, res1: {errMsg: 'Network down'}}}}/>);
        let item = screen.getByTestId('sql-case');
        expect(item.dataset.ok).toBe('false');
        expect(item.dataset.reason).toBe('request_error');
        expect(screen.getByTestId('sql-run-results').getAttribute('data-pass')).toBe('0');
    });

    test('e2e-разметка CodeRun: схема, редактор, «Запустить» и «Сдать»', () => {
        render(<CodeRun question={{_id: 5, name: 'Найти пользователей'}} jsDetails={SQL_DETAILS} history={{}} isExam/>);
        expect(screen.getByTestId('sql-schema').textContent).toContain(SQL_DETAILS.schemaSql);
        expect(screen.getByTestId('code-run-editor').querySelector('[data-testid="editor"]')).not.toBeNull();
        expect(screen.getByTestId('code-run-run').textContent).toContain('runMsg');
        expect(screen.getByTestId('code-run-submit').textContent).toContain('submitMsg');
    });

    test('админка: эталон на seed и на полном seed, ошибка схемы текстом', () => {
        render(<SqlReferenceResults data={{ordered: true, results: [
            {name: 'seed', expected: {columns: [{name: 'id'}], rows: [['1']]}},
            {name: 'seed + hidden', reason: 'setup_error', message: 'Ошибка схемы или seed задачи: syntax error'},
        ]}}/>);
        expect(screen.getByText('sqlOrdered')).toBeInTheDocument();
        expect(screen.getByText('Ошибка схемы или seed задачи: syntax error')).toBeInTheDocument();
    });
});
