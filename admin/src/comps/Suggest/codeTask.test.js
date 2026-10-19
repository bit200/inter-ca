import {fireEvent, render, screen} from '@testing-library/react';
import {
    CODE_LANGS, addFile, applyLang, buildCodeTaskTemplate, canAddToExam, monacoLanguage, referenceSignature,
    referenceStatus, removeFile, renameFile, toggleEditable, validateFilePath,
} from './codeTask';
import {ReferenceCheckPanel} from './CodeTaskEditor';

describe('шаблоны code-задачи', () => {
    test.each(CODE_LANGS)('%s: файл решения, публичный и скрытый тест, editablePaths внутри starterFiles', (lang) => {
        const t = buildCodeTaskTemplate(lang);
        expect(t.lang).toBe(lang);
        expect(Object.keys(t.testFiles).length).toBe(1);
        expect(Object.keys(t.hiddenTestFiles).length).toBe(1);
        t.editablePaths.forEach(path => {
            expect(t.starterFiles[path]).toBeDefined();
            expect(t.solutionFiles[path]).toBeDefined();
        });
    });

    test('applyLang: пустой задаче даёт шаблон, заполненной меняет только lang', () => {
        expect(applyLang({codeType: 'code'}, 'go').starterFiles['solution.go']).toBeDefined();
        const filled = {codeType: 'code', lang: 'python', starterFiles: {'a.py': 'x'}};
        expect(applyLang(filled, 'java')).toEqual({...filled, lang: 'java'});
    });
});

describe('правка файлов', () => {
    const base = {starterFiles: {'a/x.py': '1', 'b.py': '2'}, editablePaths: ['a/x.py']};

    test('переименование сохраняет порядок и editablePaths', () => {
        const next = renameFile(base, 'starterFiles', 'a/x.py', 'src/x.py');
        expect(Object.keys(next.starterFiles)).toEqual(['src/x.py', 'b.py']);
        expect(next.editablePaths).toEqual(['src/x.py']);
    });
    test('удаление убирает файл и его editablePath', () => {
        const next = removeFile(base, 'starterFiles', 'a/x.py');
        expect(next.starterFiles).toEqual({'b.py': '2'});
        expect(next.editablePaths).toEqual([]);
    });
    test('добавление и переключение editable', () => {
        expect(addFile(base, 'testFiles', 't/test.py').testFiles).toEqual({'t/test.py': ''});
        expect(toggleEditable(base, 'b.py').editablePaths).toEqual(['a/x.py', 'b.py']);
        expect(toggleEditable(base, 'a/x.py').editablePaths).toEqual([]);
    });
    test('валидация путей', () => {
        expect(validateFilePath('src/a.py', [])).toBe('');
        ['', '/a', '../a', 'a//b', 'a\\b', './a'].forEach(p => expect(validateFilePath(p, [])).not.toBe(''));
        expect(validateFilePath('a.py', ['a.py'])).toMatch(/уже есть/);
    });
    test('язык Monaco по расширению, иначе по lang', () => {
        expect(monacoLanguage('a.py', 'js')).toBe('python');
        expect(monacoLanguage('Main.java')).toBe('java');
        expect(monacoLanguage('go.mod', 'go')).toBe('plaintext');
        expect(monacoLanguage('Makefile', 'go')).toBe('go');
    });
});

describe('состояние проверки эталона', () => {
    const details = {lang: 'python', starterFiles: {'a.py': '1'}, referenceCheck: {ok: true}};

    test('none / ok / failed / stale', () => {
        expect(referenceStatus({lang: 'python'}, null)).toBe('none');
        expect(referenceStatus(details, referenceSignature(details))).toBe('ok');
        expect(referenceStatus({...details, referenceCheck: {ok: false}}, null)).toBe('failed');
        const edited = {...details, starterFiles: {'a.py': '2'}};
        expect(referenceStatus(edited, referenceSignature(details))).toBe('stale');
        expect(canAddToExam('stale')).toBe(false);
        expect(canAddToExam('ok')).toBe(true);
    });

    test('плашка: предупреждение без проверки и кнопка', () => {
        const onCheck = jest.fn();
        const {rerender} = render(<ReferenceCheckPanel details={{}} onCheck={onCheck}/>);
        expect(screen.getByText(/нельзя добавить в экзамен/)).toBeTruthy();
        fireEvent.click(screen.getByText('Проверить эталон'));
        expect(onCheck).toHaveBeenCalled();
        rerender(<ReferenceCheckPanel details={details} checkedSignature={referenceSignature(details)} onCheck={onCheck}/>);
        expect(screen.queryByText(/нельзя добавить в экзамен/)).toBeNull();
    });
});
