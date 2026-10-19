// Редактор задачи codeType 'code' (JsDetails.details): язык, наборы файлов {путь: содержимое},
// стартовый шаблон под язык, правка файлов и состояние проверки эталона (referenceCheck).

export const CODE_LANGS = ['python', 'java', 'go', 'ts', 'js', 'react'];

// Наборы файлов details: подпись, поле, можно ли выбирать editablePaths.
export const FILE_SETS = [
    {key: 'starterFiles', title: 'Стартовые файлы', hint: 'Кандидат видит их при запуске'},
    {key: 'solutionFiles', title: 'Эталонное решение', hint: 'Поверх стартовых при проверке эталона, кандидату не отдаётся'},
    {key: 'testFiles', title: 'Публичные тесты', hint: 'Кандидат видит их и запускает'},
    {key: 'hiddenTestFiles', title: 'Скрытые тесты', hint: 'Добавляются при сдаче, кандидату не видны'},
];

const SUM_TASK = 'Реализуйте функцию сложения двух чисел.';

// Минимальный проект: файл решения + тест под раннер языка. Стартовый код тесты не проходит.
const TEMPLATES = {
    python: {
        starterFiles: {'solution.py': 'def add(a, b):\n    # TODO: верните сумму\n    return None\n'},
        solutionFiles: {'solution.py': 'def add(a, b):\n    return a + b\n'},
        testFiles: {'test_solution.py': 'from solution import add\n\n\ndef test_add_positive():\n    assert add(1, 2) == 3\n'},
        hiddenTestFiles: {'test_hidden.py': 'from solution import add\n\n\ndef test_add_negative():\n    assert add(-1, -2) == -3\n'},
        editablePaths: ['solution.py'],
    },
    java: {
        starterFiles: {'src/main/java/Solution.java': 'public class Solution {\n    public static int add(int a, int b) {\n        // TODO: верните сумму\n        return 0;\n    }\n}\n'},
        solutionFiles: {'src/main/java/Solution.java': 'public class Solution {\n    public static int add(int a, int b) {\n        return a + b;\n    }\n}\n'},
        testFiles: {'src/test/java/SolutionTest.java': 'import static org.junit.jupiter.api.Assertions.assertEquals;\n\nimport org.junit.jupiter.api.Test;\n\nclass SolutionTest {\n    @Test\n    void addPositive() {\n        assertEquals(3, Solution.add(1, 2));\n    }\n}\n'},
        hiddenTestFiles: {'src/test/java/HiddenSolutionTest.java': 'import static org.junit.jupiter.api.Assertions.assertEquals;\n\nimport org.junit.jupiter.api.Test;\n\nclass HiddenSolutionTest {\n    @Test\n    void addNegative() {\n        assertEquals(-3, Solution.add(-1, -2));\n    }\n}\n'},
        editablePaths: ['src/main/java/Solution.java'],
    },
    go: {
        starterFiles: {
            'go.mod': 'module task\n\ngo 1.22\n',
            'solution.go': 'package task\n\nfunc Add(a, b int) int {\n\t// TODO: верните сумму\n\treturn 0\n}\n',
        },
        solutionFiles: {'solution.go': 'package task\n\nfunc Add(a, b int) int {\n\treturn a + b\n}\n'},
        testFiles: {'solution_test.go': 'package task\n\nimport "testing"\n\nfunc TestAddPositive(t *testing.T) {\n\tif got := Add(1, 2); got != 3 {\n\t\tt.Fatalf("Add(1, 2) = %d, want 3", got)\n\t}\n}\n'},
        hiddenTestFiles: {'hidden_test.go': 'package task\n\nimport "testing"\n\nfunc TestAddNegative(t *testing.T) {\n\tif got := Add(-1, -2); got != -3 {\n\t\tt.Fatalf("Add(-1, -2) = %d, want -3", got)\n\t}\n}\n'},
        editablePaths: ['solution.go'],
    },
    ts: {
        starterFiles: {'solution.ts': 'export function add(a: number, b: number): number {\n  // TODO: верните сумму\n  return 0;\n}\n'},
        solutionFiles: {'solution.ts': 'export function add(a: number, b: number): number {\n  return a + b;\n}\n'},
        testFiles: {'solution.test.ts': "import { add } from './solution';\n\ntest('add positive', () => {\n  expect(add(1, 2)).toBe(3);\n});\n"},
        hiddenTestFiles: {'hidden.test.ts': "import { add } from './solution';\n\ntest('add negative', () => {\n  expect(add(-1, -2)).toBe(-3);\n});\n"},
        editablePaths: ['solution.ts'],
    },
    js: {
        starterFiles: {'solution.js': 'function add(a, b) {\n  // TODO: верните сумму\n  return 0;\n}\n\nmodule.exports = { add };\n'},
        solutionFiles: {'solution.js': 'function add(a, b) {\n  return a + b;\n}\n\nmodule.exports = { add };\n'},
        testFiles: {'solution.test.js': "const { add } = require('./solution');\n\ntest('add positive', () => {\n  expect(add(1, 2)).toBe(3);\n});\n"},
        hiddenTestFiles: {'hidden.test.js': "const { add } = require('./solution');\n\ntest('add negative', () => {\n  expect(add(-1, -2)).toBe(-3);\n});\n"},
        editablePaths: ['solution.js'],
    },
    react: {
        starterFiles: {'src/Counter.jsx': "import React from 'react';\n\nexport function Counter() {\n  // TODO: кнопка «+1» и счётчик\n  return <div />;\n}\n"},
        solutionFiles: {'src/Counter.jsx': "import React, { useState } from 'react';\n\nexport function Counter() {\n  const [count, setCount] = useState(0);\n  return (\n    <div>\n      <span data-testid=\"count\">{count}</span>\n      <button onClick={() => setCount(count + 1)}>+1</button>\n    </div>\n  );\n}\n"},
        testFiles: {'src/Counter.test.jsx': "import React from 'react';\nimport { render, screen, fireEvent } from '@testing-library/react';\nimport { Counter } from './Counter';\n\ntest('starts from zero', () => {\n  render(<Counter />);\n  expect(screen.getByTestId('count').textContent).toBe('0');\n});\n"},
        hiddenTestFiles: {'src/Counter.hidden.test.jsx': "import React from 'react';\nimport { render, screen, fireEvent } from '@testing-library/react';\nimport { Counter } from './Counter';\n\ntest('increments on click', () => {\n  render(<Counter />);\n  fireEvent.click(screen.getByText('+1'));\n  expect(screen.getByTestId('count').textContent).toBe('1');\n});\n"},
        editablePaths: ['src/Counter.jsx'],
    },
};

export function buildCodeTaskTemplate(lang) {
    const template = TEMPLATES[lang];
    if (!template) {
        return {lang, starterFiles: {}, solutionFiles: {}, testFiles: {}, hiddenTestFiles: {}, editablePaths: []};
    }
    return JSON.parse(JSON.stringify({lang, ...template}));
}

export const TEMPLATE_DESCRIPTION = SUM_TASK;

// Задача ещё пустая — можно без потерь подставить шаблон.
export function isCodeTaskEmpty(details) {
    const {starterFiles, solutionFiles, testFiles, hiddenTestFiles} = details || {};
    return [starterFiles, solutionFiles, testFiles, hiddenTestFiles].every(files => Object.keys(files || {}).length === 0);
}

// Переключение codeType на 'code' / смена языка: у пустой задачи — шаблон нового языка,
// у заполненной меняется только lang (файлы автора не затираем).
export function applyLang(details, lang) {
    if (isCodeTaskEmpty(details)) {
        return {...details, ...buildCodeTaskTemplate(lang)};
    }
    return {...details, lang};
}

export function monacoLanguage(path, lang) {
    const ext = ((path || '').split('.').pop() || '').toLowerCase();
    const byExt = {
        py: 'python', java: 'java', go: 'go', ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
        json: 'json', md: 'markdown', xml: 'xml', yml: 'yaml', yaml: 'yaml', html: 'html', css: 'css', sql: 'sql', mod: 'plaintext',
    };
    if (byExt[ext]) {
        return byExt[ext];
    }
    const byLang = {python: 'python', java: 'java', go: 'go', ts: 'typescript', js: 'javascript', react: 'javascript'};
    return byLang[lang] || 'plaintext';
}

// Путь допустим для песочницы: относительный, без «..», без пустых сегментов (как isSafeRelativePath в api).
export function validateFilePath(path, existing) {
    const value = (path || '').trim();
    if (!value) return 'Укажите путь файла';
    if (value.startsWith('/') || value.includes('\\')) return 'Путь относительный, со слэшами «/»';
    if (value.split('/').some(part => part === '' || part === '.' || part === '..')) return 'Недопустимый путь (пустые сегменты, «.» и «..»)';
    if ((existing || []).includes(value)) return 'Файл с таким путём уже есть';
    return '';
}

export function addFile(details, setKey, path, content = '') {
    return {...details, [setKey]: {...(details[setKey] || {}), [path]: content}};
}

// Переименование сохраняет порядок файлов; в starterFiles заодно переименовывается и путь в editablePaths.
export function renameFile(details, setKey, from, to) {
    const files = Object.fromEntries(Object.entries(details[setKey] || {}).map(([path, content]) => [path === from ? to : path, content]));
    const next = {...details, [setKey]: files};
    if (setKey === 'starterFiles') {
        next.editablePaths = (details.editablePaths || []).map(path => path === from ? to : path);
    }
    return next;
}

export function removeFile(details, setKey, path) {
    const files = {...(details[setKey] || {})};
    delete files[path];
    const next = {...details, [setKey]: files};
    if (setKey === 'starterFiles') {
        next.editablePaths = (details.editablePaths || []).filter(item => item !== path);
    }
    return next;
}

export function toggleEditable(details, path) {
    const current = details.editablePaths || [];
    const editablePaths = current.includes(path) ? current.filter(item => item !== path) : [...current, path];
    return {...details, editablePaths};
}

// Всё, от чего зависит проверка эталона (как referenceHash в api): правка любого поля делает её устаревшей.
export function referenceSignature(details) {
    const {lang, starterFiles, solutionFiles, editablePaths, testFiles, hiddenTestFiles} = details || {};
    return JSON.stringify([lang || '', starterFiles || {}, solutionFiles || {}, [...(editablePaths || [])].sort(), testFiles || {}, hiddenTestFiles || {}]);
}

// Состояние для плашки: none — не проверялась, stale — файлы менялись после проверки,
// ok — эталон прошёл и стартовый код упал, failed — проверка не пройдена.
// checkedSignature — подпись файлов на момент загрузки/проверки (null — неизвестна).
export function referenceStatus(details, checkedSignature) {
    const check = (details || {}).referenceCheck;
    if (!check) return 'none';
    if (checkedSignature !== null && checkedSignature !== undefined && checkedSignature !== referenceSignature(details)) return 'stale';
    return check.ok ? 'ok' : 'failed';
}

export function canAddToExam(status) {
    return status === 'ok';
}
