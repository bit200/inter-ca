import { sortByDictationDate } from './evaluate-list.utils';

describe('sortByDictationDate', () => {
    const items = [
        { _id: 'mid', cd: '2026-05-02T10:00:00Z' },
        { _id: 'new', cd: '2026-05-09T10:00:00Z' },
        { _id: 'old', cd: '2026-04-20T10:00:00Z' },
    ];
    const ids = list => list.map(it => it._id);

    it('по умолчанию ставит свежие ответы первыми', () => {
        expect(ids(sortByDictationDate(items))).toEqual(['new', 'mid', 'old']);
    });

    it('в обратном порядке ставит первыми самые старые', () => {
        expect(ids(sortByDictationDate(items, 'old'))).toEqual(['old', 'mid', 'new']);
    });

    it('не трогает исходный массив', () => {
        sortByDictationDate(items);
        expect(ids(items)).toEqual(['mid', 'new', 'old']);
    });

    it('записи без даты уводит в конец в любом направлении', () => {
        const withEmpty = [{ _id: 'none' }, ...items, { _id: 'bad', cd: 'не дата' }];
        expect(ids(sortByDictationDate(withEmpty)).slice(-2).sort()).toEqual(['bad', 'none']);
        expect(ids(sortByDictationDate(withEmpty, 'old')).slice(-2).sort()).toEqual(['bad', 'none']);
    });
});
