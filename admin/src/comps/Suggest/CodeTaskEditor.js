import React, {useEffect, useRef, useState} from 'react';
import LazyEditor from '../LazyEditor/LazyEditor';
import {
    FILE_SETS, addFile, canAddToExam, monacoLanguage, referenceSignature, referenceStatus,
    removeFile, renameFile, toggleEditable, validateFilePath,
} from './codeTask';
import './codeTask.scss';

const STATUS_TEXT = {
    none: 'Эталон не проверен',
    stale: 'Файлы менялись после проверки — проверьте эталон заново',
    ok: 'Эталон прошёл все тесты, стартовый код падает',
    failed: 'Проверка эталона не пройдена',
};

// Плашка результата referenceCheck + явное предупреждение, пока задачу нельзя добавить в экзамен.
export function ReferenceCheckPanel({details, checkedSignature, loading, error, onCheck}) {
    const status = referenceStatus(details, checkedSignature);
    const check = (details || {}).referenceCheck || null;
    const solution = (check || {}).solution;
    const starter = (check || {}).starter;
    return <div className="codeTaskCheck" data-status={status}>
        <div className="codeTaskCheckHead">
            <button className="btn btn-xs btn-default" disabled={loading} onClick={onCheck}>
                {loading ? 'Проверяю…' : 'Проверить эталон'}
            </button>
            <b>{STATUS_TEXT[status]}</b>
        </div>
        {error && <div className="codeTaskCheckError">{error}</div>}
        {check && <ul className="codeTaskCheckList">
            <li>Эталон: {solution ? `${solution.passCount}/${solution.totalCount} тестов` : check.ok ? 'прошёл 100%' : 'не прошёл 100%'}
                {check.publicTestCount != null && ` (публичных ${check.publicTestCount}, всего ${check.totalTestCount})`}</li>
            <li>Стартовый код: {starter ? `${starter.passCount}/${starter.totalCount} тестов, ${starter.compileError ? 'не собирается' : 'падает'}` : 'падает на тестах — как и должно быть'}</li>
            {(check.errors || []).map((message, ind) => <li key={ind} className="codeTaskCheckError">{message}</li>)}
            {check.checkedAt && <li className="codeTaskCheckMuted">Проверено: {new Date(check.checkedAt).toLocaleString()}</li>}
        </ul>}
        {!canAddToExam(status) && <div className="codeTaskCheckWarn">
            Без успешной проверки эталона задачу нельзя добавить в экзамен — сохранение экзамена будет отклонено.
        </div>}
    </div>;
}

function FileSet({setKey, title, hint, details, onChange}) {
    const files = (details || {})[setKey] || {};
    const paths = Object.keys(files);
    const [selected, setSelected] = useState(paths[0] || '');
    const [error, setError] = useState('');
    const current = paths.includes(selected) ? selected : paths[0] || '';
    const isStarter = setKey === 'starterFiles';

    function ask(message, value) {
        return window.prompt(message, value || '');
    }
    function onAdd() {
        const path = (ask('Путь нового файла (папки через «/»)', '') || '').trim();
        if (!path) return;
        const message = validateFilePath(path, paths);
        setError(message);
        if (message) return;
        onChange(addFile(details, setKey, path));
        setSelected(path);
    }
    function onRename() {
        const path = (ask('Новый путь файла', current) || '').trim();
        if (!path || path === current) return;
        const message = validateFilePath(path, paths);
        setError(message);
        if (message) return;
        onChange(renameFile(details, setKey, current, path));
        setSelected(path);
    }
    function onRemove() {
        if (!window.confirm(`Удалить файл ${current}?`)) return;
        onChange(removeFile(details, setKey, current));
        setError('');
    }

    return <div className="codeTaskSet">
        <div className="title-use-case">{title}</div>
        <small className="codeTaskMuted">{hint}</small>
        <div className="codeTaskTabs">
            {paths.map(path => <span key={path}
                className={'filesItem ib ' + (path === current ? 'correct' : '')}
                onClick={() => setSelected(path)}>
                {path}
                {isStarter && <label className="codeTaskEditable" title="Кандидат может править этот файл" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={(details.editablePaths || []).includes(path)}
                        onChange={() => onChange(toggleEditable(details, path))}/> правит кандидат
                </label>}
            </span>)}
            <button className="btn btn-xs btn-default" onClick={onAdd}>+ файл</button>
            {current && <button className="btn btn-xs btn-default" onClick={onRename}>Переименовать</button>}
            {current && <button className="btn btn-xs btn-default" onClick={onRemove}>Удалить</button>}
        </div>
        {error && <div className="codeTaskCheckError">{error}</div>}
        {current ? <LazyEditor
            height="260px"
            language={monacoLanguage(current, details.lang)}
            defaultLanguage={monacoLanguage(current, details.lang)}
            value={files[current] || ''}
            onChange={value => onChange({...details, [setKey]: {...files, [current]: value || ''}})}
        /> : <div className="codeTaskMuted">Файлов нет</div>}
    </div>;
}

// Редактор code-задачи: item — details из Smart; onChange получает новые details целиком.
function CodeTaskEditor({item, questionId, onChange}) {
    const details = item || {};
    const sigRef = useRef(details.referenceCheck ? referenceSignature(details) : null);
    const [, force] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        sigRef.current = details.referenceCheck ? sigRef.current : null;
    }, [questionId]);

    function onCheck() {
        setLoading(true);
        setError('');
        global.http.post('/admin-check-reference', {question: questionId}).then(res => {
            setLoading(false);
            const next = {...details, referenceCheck: res.referenceCheck};
            sigRef.current = referenceSignature(next);
            force(n => n + 1);
            onChange(next);
        }, e => {
            setLoading(false);
            setError((e && (e.error || e.message)) || String(e));
        });
    }

    return <div className="codeTaskEditor">
        <ReferenceCheckPanel details={details} checkedSignature={sigRef.current} loading={loading} error={error} onCheck={onCheck}/>
        {FILE_SETS.map(set => <FileSet key={set.key} {...set} details={details} onChange={onChange}/>)}
    </div>;
}

export default CodeTaskEditor;
