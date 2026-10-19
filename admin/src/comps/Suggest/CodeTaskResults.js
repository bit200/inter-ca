import React from 'react';
import './codeTask.scss';

// Задачи по языкам (codeType 'code'): файлы с папками, редактируются только editablePaths,
// результат прогона — список тестов, ошибка компиляции отдельным блоком.

export function isCodeTaskDetails(jsDetails) {
    return (jsDetails || {}).codeType === 'code';
}

// Все файлы задачи для дерева: редактируемые, затем публичные тесты (только чтение).
export function getCodeTaskFiles(jsDetails) {
    let {starterFiles = {}, testFiles = {}, editablePaths = []} = jsDetails || {};
    let editable = (editablePaths || []).filter(Boolean);
    let tests = Object.keys(testFiles || {}).filter(p => !editable.includes(p));
    let others = Object.keys(starterFiles || {}).filter(p => !editable.includes(p) && !tests.includes(p));
    let all = [
        ...editable.map(name => ({name, readOnly: false})),
        ...others.map(name => ({name, readOnly: true})),
        ...tests.map(name => ({name, readOnly: true})),
    ];
    return all.sort((a, b) => a.name.localeCompare(b.name));
}

export function getCodeTaskContent(jsDetails, history, path) {
    let saved = ((history || {}).files || {})[path];
    if (typeof saved === 'string') return saved;
    let {starterFiles = {}, testFiles = {}} = jsDetails || {};
    return starterFiles[path] ?? testFiles[path] ?? '';
}

// Что уходит в /run-question: все редактируемые файлы (сохранённые правки или стартовый код).
export function collectEditableFiles(jsDetails, history, currentPath, currentCode) {
    let res = {};
    ((jsDetails || {}).editablePaths || []).forEach(path => {
        res[path] = path === currentPath && typeof currentCode === 'string'
            ? currentCode
            : getCodeTaskContent(jsDetails, history, path);
    });
    return res;
}

const EXT_LANG = {
    py: 'python', java: 'java', go: 'go', ts: 'typescript', tsx: 'typescript',
    js: 'javascript', jsx: 'javascript', json: 'json', md: 'markdown', css: 'css', html: 'html', sql: 'sql',
};
const LANG_LANG = {python: 'python', java: 'java', go: 'go', typescript: 'typescript', javascript: 'javascript', react: 'javascript'};

export function getCodeTaskLanguage(fileName, lang) {
    let ext = ((fileName || '').split('.').pop() || '').toLowerCase();
    return EXT_LANG[ext] || LANG_LANG[(lang || '').toLowerCase()] || 'plaintext';
}

// Элементы дерева: папки и файлы с глубиной вложенности, в порядке обхода.
export function buildTreeRows(files) {
    let rows = [];
    let seen = {};
    (files || []).forEach((file, ind) => {
        let parts = file.name.split('/');
        parts.slice(0, -1).forEach((part, depth) => {
            let dir = parts.slice(0, depth + 1).join('/');
            if (!seen[dir]) {
                seen[dir] = true;
                rows.push({type: 'dir', name: part, path: dir, depth});
            }
        });
        rows.push({type: 'file', name: parts[parts.length - 1], path: file.name, depth: parts.length - 1, ind, readOnly: file.readOnly});
    });
    return rows;
}

export function CodeFilesTree({files, selectedInd, onSelect}) {
    return <div className="codeFilesTree" data-testid="code-files-tree">
        {buildTreeRows(files).map(row => row.type === 'dir'
            ? <div key={'d' + row.path} className="codeTreeDir" style={{paddingLeft: 8 + row.depth * 12}}>
                <i className="iconoir-folder"></i> {row.name}
            </div>
            : <div key={'f' + row.path}
                   data-testid="code-file" data-path={row.path} data-readonly={String(!!row.readOnly)}
                   className={'codeTreeFile ' + (row.ind === selectedInd ? 'selectedFile' : '')}
                   style={{paddingLeft: 8 + row.depth * 12}}
                   title={row.readOnly ? t('codeFileReadonly') : ''}
                   onClick={() => onSelect(row.ind)}>
                {row.name}{row.readOnly && <i className="iconoir-lock codeTreeLock" data-testid="code-readonly-icon"></i>}
            </div>)}
    </div>
}

export function CodeTaskResults({runResults}) {
    let {tests = [], totalCount, passCount, compileError, firstError} = runResults || {};
    if (!totalCount && !compileError && !firstError) return <div>{t('notStartedTests')}</div>;
    let requestError = !tests.length && !compileError && firstError
        ? firstError.errMsg || firstError.message || (firstError.res1 || {}).errMsg
        : '';
    return <div className="codeTaskResults" data-testid="code-task-results" data-passed={passCount || 0} data-total={totalCount || 0}>
        {!!totalCount && <div>{t('testPasses')} {passCount} {t('from')} {totalCount}</div>}
        {compileError && <div className="codeCompileError" data-testid="code-compile-error">
            <b>{t('codeCompileError')}</b>
            <pre>{compileError}</pre>
        </div>}
        {requestError && <pre className="codeCompileError">{String(requestError)}</pre>}
        {!!tests.length && <div className="codeTestsList" data-testid="code-tests-list">
            {tests.map((test, ind) => {
                let ok = test.status === 'passed';
                return <div key={ind} className="codeTest" status={ok ? 'ok' : 'error'}
                            data-testid="code-test" data-status={test.status} data-hidden={String(!!test.hidden)}>
                    <div className="codeTestHead">
                        <span className="run-circle"></span>
                        <span>{test.hidden ? t('codeTestHidden') : test.name}</span>
                        <small>{test.status}</small>
                    </div>
                    {!test.hidden && !ok && test.message && <pre>{test.message}</pre>}
                </div>
            })}
        </div>}
    </div>
}
