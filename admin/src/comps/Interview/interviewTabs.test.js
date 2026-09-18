import {tabIndexFromKey, tabKeyAt} from './interviewTabs';

const tabs = [
    {urlKey: 'questions'},
    {urlKey: 'main'},
    null,
    {urlKey: 'dialog'},
];

describe('вкладка интервью в адресе', () => {
    test('ключ из адреса выбирает свою вкладку', () => {
        expect(tabIndexFromKey(tabs, 'dialog')).toBe(3);
        expect(tabIndexFromKey(tabs, 'main')).toBe(1);
    });

    test('без ключа или с чужим ключом открывается первая вкладка', () => {
        expect(tabIndexFromKey(tabs, '')).toBe(0);
        expect(tabIndexFromKey(tabs, 'nope')).toBe(0);
        expect(tabIndexFromKey([null, {urlKey: 'x'}], null)).toBe(1);
    });

    test('ключ вкладки по индексу для записи в адрес', () => {
        expect(tabKeyAt(tabs, 3)).toBe('dialog');
        expect(tabKeyAt(tabs, 2)).toBe('');
    });
});

// Порядок вкладок задан литералом в Interview.js; компонент тянет весь редактор,
// поэтому порядок urlKey проверяем по исходнику.
describe('порядок вкладок карточки интервью', () => {
    test('первым идёт разбор диалога, затем обзор; вкладки «Вопросы» нет', () => {
        const fs = require('fs');
        const path = require('path');
        const src = fs.readFileSync(path.join(__dirname, 'Interview.js'), 'utf8');
        const keys = [...src.matchAll(/urlKey: '([a-z]+)'/g)].map(m => m[1]);
        expect(keys).toEqual(['dialog', 'overview', 'admin']);
    });
});

// Подписи вкладок: первая (разбор диалога) - «Обзор», вторая - «Данные».
// Читаем исходник: компонент Interview тянет весь редактор и в тесте не рендерится.
describe('подписи вкладок карточки интервью', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, 'Interview.js'), 'utf8');

    test('вкладка разбора диалога подписана «Обзор», вкладка полей - «Данные»', () => {
        const names = [...src.matchAll(/name: t\('(\w+)'\), urlKey: '(\w+)'/g)]
            .map(m => [m[2], m[1]]);
        expect(names).toEqual([['dialog', 'overview'], ['overview', 'interviewData']]);
    });

    test('ключ interviewData переведён как «Данные»', () => {
        const lngs = fs.readFileSync(path.join(__dirname, '../i18/lngs.js'), 'utf8');
        expect(lngs).toMatch(/"interviewData":\s*\{\s*ru:\s*"Данные"/);
    });
});
