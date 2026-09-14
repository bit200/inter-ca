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
