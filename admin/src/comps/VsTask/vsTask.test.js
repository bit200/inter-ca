import {getExamVsTasks, getVscodeLink, isSqlTask, isVsTask, lastSessionStep, pickLng, pubTestInfo} from './vsTask';

describe('VS Code-задачи: распознавание и сводка тестов', () => {
    test('VsTaskGroup из экзамена — VS-задача, обычный вопрос — нет', () => {
        expect(isVsTask({_id: 5, type: 'vs_task'})).toBe(true);
        expect(isVsTask({_id: 5, info_arr: []})).toBe(true);
        expect(isVsTask({_id: 7, answerType: 'code', files: []})).toBe(false);
        expect(isVsTask(null)).toBe(false);
    });

    test('задачи экзамена берутся из templateInfo.vsTasksDb или vsTasksDb', () => {
        expect(getExamVsTasks({templateInfo: {vsTasksDb: [{_id: 1, name: 'a'}]}})).toEqual([{_id: 1, name: 'a', type: 'vs_task'}]);
        expect(getExamVsTasks({vsTasksDb: [{_id: 2}], templateInfo: {vsTasksDb: [{_id: 1}]}})[0]._id).toBe(2);
        expect(getExamVsTasks({})).toEqual([]);
    });

    test('SQL определяется по языку варианта, сессии или названию', () => {
        expect(isSqlTask({info_arr: [{lng: 'sql', task_id: 3}]})).toBe(true);
        expect(isSqlTask({info_arr: [{lng: 'js', task_id: 3}]}, {info: {lng: 'postgresql'}})).toBe(true);
        expect(isSqlTask({name: 'SQL: выборка заказов'})).toBe(true);
        expect(isSqlTask({name: 'React todo', info_arr: [{lng: 'js', task_id: 3}]})).toBe(false);
        expect(isSqlTask({name: 'nosqlish results'})).toBe(false);
    });

    test('язык: сохранённый, если он активен, иначе первый активный', () => {
        let task = {info_arr: [{lng: 'js', task_id: 1, status: 'unactive'}, {lng: 'sql', task_id: 2}, {lng: 'py', task_id: 3}]};
        expect(pickLng(task, {lng: 'py'})).toBe('py');
        expect(pickLng(task, {lng: 'js'})).toBe('sql');
        expect(pickLng(task)).toBe('sql');
    });

    test('сводка из VsSession.test_info и из pub_test_info', () => {
        expect(pubTestInfo({status: 'err', details: {total: 5, passed: 3, failed: 2}}))
            .toEqual({hasResult: true, total: 5, passed: 3, failed: 2, status: 'err'});
        expect(pubTestInfo({status: 'ok', total: 4, passed: 4}))
            .toEqual({hasResult: true, total: 4, passed: 4, failed: 0, status: 'ok'});
        expect(pubTestInfo({details: {total: 2, passed: 1}}).status).toBe('err');
        expect(pubTestInfo(undefined).hasResult).toBe(false);
        expect(pubTestInfo({status: 'ok', details: {}}).hasResult).toBe(false);
    });

    test('шаг запуска и ссылка на редактор', () => {
        expect(lastSessionStep({arr: [{status: 'zip'}, {status: 'compose_up'}]})).toBe('compose_up');
        expect(lastSessionStep([])).toBe('');
        expect(getVscodeLink({start_info: {start_data: {vscode_link: 'https://v/1'}}})).toBe('https://v/1');
        expect(getVscodeLink({vscode_link: 'https://v/2'})).toBe('https://v/2');
        expect(getVscodeLink({})).toBe('');
    });
});

describe('fixVscodeLink', () => {
    const {fixVscodeLink} = require('./vsTask');
    const bad = 'http://localhost/vs/50505/?folder=/home/itk/itk-livecoding&tkn=abc';
    it('дописывает порт docker-m, если в ссылке его нет', () => {
        expect(fixVscodeLink(bad, 'http://localhost:3010'))
            .toBe('http://localhost:3010/vs/50505/?folder=/home/itk/itk-livecoding&tkn=abc');
    });
    it('локально: server_http 0.0.0.0:3010, в ссылке localhost с пустым портом', () => {
        expect(fixVscodeLink('http://localhost:/vs/50506/?folder=/h&tkn=a', 'http://0.0.0.0:3010'))
            .toBe('http://localhost:3010/vs/50506/?folder=/h&tkn=a');
    });
    it('не трогает ссылку с портом, чужой хост и пустой server_http', () => {
        let ok = 'http://localhost:3010/vs/1/?tkn=a';
        expect(fixVscodeLink(ok, 'http://localhost:3010')).toBe(ok);
        expect(fixVscodeLink('https://vcode-cdn.itk.academy/5/', 'https://dm.itk.academy:3010')).toBe('https://vcode-cdn.itk.academy/5/');
        expect(fixVscodeLink(bad, '')).toBe(bad);
    });
});

describe('учёт VS-задач в проценте проверки знаний', () => {
    const {calcQuizPerc, countVsQuizes} = require('./vsTask');
    const pub = [{opts: {quiz: 61}}, {opts: {quiz: 'vs_9'}}];
    it('считает VS-задачи группы по ключу vs_', () => {
        expect(countVsQuizes(pub)).toBe(1);
        expect(countVsQuizes(undefined)).toBe(0);
    });
    it('нерешённая VS-задача снижает процент, решённая — нет', () => {
        expect(calcQuizPerc({61: {isCorrect: true}, vs_9: {isCorrect: false}}, 2).quizPerc).toBe(50);
        expect(calcQuizPerc({61: {isCorrect: true}, vs_9: {isCorrect: true}}, 2).quizPerc).toBe(100);
        expect(calcQuizPerc({61: {isCorrect: true}}, 2).quizPerc).toBe(50);
    });
});
